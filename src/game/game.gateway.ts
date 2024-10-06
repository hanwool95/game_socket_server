import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma.service'; // 비동기 처리

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'https://www.ceasar.kr'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    pingInterval: 10000,
    pingTimeout: 5000,
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('GameGateway');
  private rooms: Map<
    string,
    {
      clients: string[];
      nicknames: string[];
      host: string;
      scores: number[];
      currentTurn: number; // 현재 차례를 저장
      currentPokemon: string; // 현재 포켓몬의 한국어 이름 (정답)
      imageUrl: string;
      currentHint: string; // 현재 힌트
      timer: number;
    }
  > = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {} // HttpService 추가

  afterInit(server: Server) {
    this.logger.log('Init');
  }

  private async getRandomPokemon(): Promise<{
    image: string;
    koreanName: string;
  }> {
    const pokemonId = Math.floor(Math.random() * 898) + 1; // 1부터 898 사이의 포켓몬 선택
    const response = await firstValueFrom(
      this.httpService.get(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`),
    );
    const speciesUrl = response.data.species.url;
    const speciesResponse = await firstValueFrom(
      this.httpService.get(speciesUrl),
    );

    // 포켓몬 한국어 이름 가져오기
    const koreanName = speciesResponse.data.names.find(
      (name) => name.language.name === 'ko',
    )?.name;

    return {
      image: response.data.sprites.front_default, // 포켓몬 이미지 URL
      koreanName,
    };
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 7); // 랜덤한 5글자 코드 생성
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.rooms.forEach((room, roomCode) => {
      const clientIndex = room.clients.indexOf(client.id);
      if (clientIndex !== -1) {
        room.clients.splice(clientIndex, 1);
        room.nicknames.splice(clientIndex, 1);
        room.scores.splice(clientIndex, 1);
      }

      if (room.host === client.id && room.clients.length > 0) {
        room.host = room.clients[0];
        this.logger.log(`New host for room ${roomCode} is ${room.host}`);
        this.server.to(roomCode).emit('newHost', room.host);
      }

      if (room.clients.length === 0) {
        this.rooms.delete(roomCode);
        this.logger.log(`Room ${roomCode} deleted as it is empty`);
      } else {
        this.server.to(roomCode).emit('updateUsers', room.nicknames);
      }
    });
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(
    client: Socket,
    { nickname }: { nickname: string },
  ): Promise<void> {
    const roomCode = this.generateRoomCode();
    client.join(roomCode);

    const { image, koreanName } = await this.getRandomPokemon();

    this.rooms.set(roomCode, {
      clients: [client.id],
      nicknames: [nickname],
      host: client.id,
      scores: [0],
      currentTurn: 0,
      currentPokemon: koreanName,
      imageUrl: image,
      currentHint: '',
      timer: 60,
    });

    this.logger.log(`${nickname} created room ${roomCode}`);
    client.emit('roomCreated', roomCode);
    this.server
      .to(roomCode)
      .emit('updateUsers', this.rooms.get(roomCode).nicknames);
    client.emit('newHost', client.id);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    client: Socket,
    { roomCode, nickname }: { roomCode: string; nickname: string },
  ): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      if (room.clients.length >= 8) {
        client.emit('error', '방이 가득 찼습니다.');
        return;
      }

      if (room.nicknames.includes(nickname)) {
        client.emit('error', '중복된 닉네임이 존재합니다');
        return;
      }

      client.join(roomCode);
      room.clients.push(client.id);
      room.nicknames.push(nickname);
      room.scores.push(0);
      this.rooms.set(roomCode, room);
      this.logger.log(`${nickname} joined room ${roomCode}`);
      client.emit('joinedRoom', roomCode);
      this.server.to(roomCode).emit('updateUsers', room.nicknames); // 닉네임 리스트 업데이트
    } else {
      client.emit('error', '방을 찾지 못했습니다.');
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(
    client: Socket,
    { roomCode, timer }: { roomCode: string; timer: number },
  ): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (room && room.host === client.id) {
      this.logger.log(`Game started in room ${roomCode} by host ${client.id}`);
      room.timer = timer;
      console.log(' room timer set: ', timer);
      this.server
        .to(roomCode)
        .emit('gameStarted', { scores: room.scores, timer: timer });
      this.server
        .to(roomCode)
        .emit('yourTurn', room.nicknames[room.currentTurn]); // 현재 차례인 사용자 전송
      this.server.to(roomCode).emit('pokemonImage', {
        image: room.imageUrl,
        name: room.currentPokemon,
        timer,
      });
    } else {
      client.emit('error', '방장만 게임 시작을 누를 수 있습니다.');
    }
  }

  private async nextTurn({ room, roomCode }) {
    const { image, koreanName } = await this.getRandomPokemon();
    room.currentPokemon = koreanName;
    room.currentHint = '';

    // 차례 넘기기
    room.currentTurn = (room.currentTurn + 1) % room.clients.length;
    console.log('roomTimer: ', room.timer);
    this.server
      .to(roomCode)
      .emit('pokemonImage', { image, name: koreanName, timer: room.timer });
    this.server.to(roomCode).emit('yourTurn', room.nicknames[room.currentTurn]); // 다음 차례 사용자 알림
  }

  @SubscribeMessage('submitGuess')
  async handleSubmitGuess(
    client: Socket,
    { roomCode, guess }: { roomCode: string; guess: string },
  ): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (room) {
      const correctAnswer = room.currentPokemon;
      if (guess === correctAnswer) {
        const clientIndex = room.clients.indexOf(client.id);
        const updatedScore = 400 - (room.currentHint.length / 2) * 100;
        if (updatedScore > 0) {
          room.scores[clientIndex] += updatedScore;
          room.scores[room.currentTurn] += updatedScore;
        }
        this.logger.log(
          `${room.nicknames[clientIndex]} guessed the correct answer!`,
        );

        this.server.to(roomCode).emit('gameMessage', {
          message: `정답: ${correctAnswer}
정답자: ${room.nicknames[clientIndex]}
점수획득: ${updatedScore}점`,
        });

        this.server.to(roomCode).emit('updateScores', room.scores); // 점수 업데이트
        this.nextTurn({ room, roomCode });
      } else {
        client.emit('wrongGuess');
      }
    }
  }

  @SubscribeMessage('skipRound')
  async handleSkipRound(
    client: Socket,
    { roomCode }: { roomCode: string },
  ): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (room) {
      this.server.to(roomCode).emit('gameMessage', {
        message: `출제자가 패스하였습니다`,
      });
      this.nextTurn({ room, roomCode });
    }
  }

  @SubscribeMessage('addHint')
  async handleAddHint(
    client: Socket,
    { roomCode, hint }: { roomCode: string; hint: string },
  ): Promise<void> {
    const room = this.rooms.get(roomCode);
    if (room) {
      const nextHint = room.currentHint + hint;
      this.rooms.set(roomCode, {
        ...this.rooms.get(roomCode),
        currentHint: nextHint,
      });

      await this.prisma.pokemonEmoji.create({
        data: {
          pokemon: room.currentPokemon,
          emoji: nextHint,
        },
      });

      this.server.to(roomCode).emit('addHint', { hint: nextHint });
    }
  }

  @SubscribeMessage('chat')
  handleMessage(
    client: Socket,
    {
      roomCode,
      message,
      nickname,
    }: { roomCode: string; message: string; nickname: string },
  ): void {
    this.logger.log(`Message from ${nickname} in room ${roomCode}: ${message}`);
    this.server.to(roomCode).emit('chat', { sender: nickname, message });
  }
}
