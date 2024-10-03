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
  handleCreateRoom(client: Socket): void {
    const roomCode = this.generateRoomCode();
    client.join(roomCode); // 클라이언트를 방에 참여시킴
    this.rooms.set(roomCode, [client.id]); // 방에 사용자 추가
    this.logger.log(`Room ${roomCode} created by ${client.id}`);

    client.emit('roomCreated', roomCode); // 클라이언트에게 방 코드 전달
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      client.join(roomCode); // 방에 참여
      room.push(client.id); // 사용자 목록에 추가
      this.rooms.set(roomCode, room); // 업데이트된 사용자 목록 저장
      this.logger.log(`Client ${client.id} joined room ${roomCode}`);

      client.emit('joinedRoom', roomCode); // 클라이언트에게 방 참여 성공 알림
      this.server.to(roomCode).emit('newUser', `${client.id} joined the room`);
    } else {
      client.emit('error', 'Room not found'); // 방이 없을 때 에러 처리
    }
  }

  @SubscribeMessage('chat')
  handleMessage(
    client: Socket,
    { roomCode, message }: { roomCode: string; message: string },
  ): void {
    this.logger.log(
      `Message from ${client.id} in room ${roomCode}: ${message}`,
    );

    // 같은 방의 사용자들에게 메시지 전달
    this.server.to(roomCode).emit('chat', { sender: client.id, message });
  }
}
