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
    pingInterval: 10000, // Ping 클라이언트마다 10초 간격으로 신호를 보냄
    pingTimeout: 5000, // 5초 안에 응답이 없으면 클라이언트 연결 끊음
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('GameGateway');
  private rooms: Map<string, string[]> = new Map(); // 방과 사용자 목록 관리

  afterInit(server: Server) {
    this.logger.log('Init');
  }

  // 임의의 5글자 방 코드 생성
  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 7); // 랜덤한 5글자 코드 생성
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    this.rooms.forEach((clients, roomCode) => {
      this.rooms.set(
        roomCode,
        clients.filter((id) => id !== client.id),
      );
      if (this.rooms.get(roomCode)?.length === 0) {
        this.rooms.delete(roomCode); // 방에 사용자가 없으면 방 삭제
        this.logger.log(`Room ${roomCode} deleted as it is empty`);
      }
    });
  }

  @SubscribeMessage('createRoom')
  handleCreateRoom(client: Socket, { nickname }: { nickname: string }): void {
    const roomCode = this.generateRoomCode();
    client.join(roomCode);
    this.rooms.set(roomCode, [client.id]);
    this.logger.log(`${nickname} created room ${roomCode}`);
    client.emit('roomCreated', roomCode);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    client: Socket,
    { roomCode, nickname }: { roomCode: string; nickname: string },
  ): void {
    const room = this.rooms.get(roomCode);
    console.log('room: ', room);
    if (room) {
      client.join(roomCode);
      room.push(client.id);
      this.rooms.set(roomCode, room);
      this.logger.log(`${nickname} joined room ${roomCode}`);
      client.emit('joinedRoom', roomCode);
      this.server.to(roomCode).emit('newUser', `${nickname} joined the room`);
    } else {
      client.emit('error', 'Room not found');
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
