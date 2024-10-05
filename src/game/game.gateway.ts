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
  private rooms: Map<string, { clients: string[]; nicknames: string[] }> =
    new Map();

  afterInit(server: Server) {
    this.logger.log('Init');
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
      room.clients = room.clients.filter((id) => id !== client.id);
      room.nicknames = room.nicknames.filter(
        (nickname) => nickname !== client.id,
      ); // 닉네임 리스트에서 제거
      if (room.clients.length === 0) {
        this.rooms.delete(roomCode); // 방에 사용자가 없으면 방 삭제
        this.logger.log(`Room ${roomCode} deleted as it is empty`);
      } else {
        this.server.to(roomCode).emit('updateUsers', room.nicknames); // 닉네임 리스트 업데이트
      }
    });
  }

  @SubscribeMessage('createRoom')
  handleCreateRoom(client: Socket, { nickname }: { nickname: string }): void {
    const roomCode = this.generateRoomCode();
    client.join(roomCode);
    this.rooms.set(roomCode, { clients: [client.id], nicknames: [nickname] });
    this.logger.log(`${nickname} created room ${roomCode}`);
    client.emit('roomCreated', roomCode);
    this.server
      .to(roomCode)
      .emit('updateUsers', this.rooms.get(roomCode).nicknames);
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
      client.join(roomCode);
      room.clients.push(client.id);
      room.nicknames.push(nickname);
      this.rooms.set(roomCode, room);
      this.logger.log(`${nickname} joined room ${roomCode}`);
      client.emit('joinedRoom', roomCode);
      this.server.to(roomCode).emit('updateUsers', room.nicknames); // 닉네임 리스트 업데이트
    } else {
      client.emit('error', '방을 찾지 못했습니다.');
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
