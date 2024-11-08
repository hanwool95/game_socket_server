// src/youtube/youtube.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class YoutubeService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('YOUTUBE_API_URL');
    this.apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
  }

  async getVideoStats(videoId: string) {
    try {
      // 동영상의 좋아요 수 가져오기
      const videoResponse = await this.httpService
        .get(`${this.apiUrl}/videos`, {
          params: {
            part: 'statistics',
            id: videoId,
            key: this.apiKey,
          },
        })
        .toPromise();

      const { likeCount } = videoResponse.data.items[0].statistics;

      return { likeCount };
    } catch (error) {
      console.error('Error fetching YouTube data:', error);
      throw new Error('Failed to fetch YouTube data');
    }
  }

  async getVideoComments(videoId: string) {
    try {
      // 댓글 목록 가져오기 (최대 5개의 댓글)
      const commentsResponse = await this.httpService
        .get(`${this.apiUrl}/commentThreads`, {
          params: {
            part: 'snippet',
            videoId: videoId,
            key: this.apiKey,
          },
        })
        .toPromise();

      // 댓글 목록을 원하는 형식으로 변환
      const comments = commentsResponse.data.items.map((item) => ({
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        likeCount: item.snippet.topLevelComment.snippet.likeCount,
      }));

      return comments;
    } catch (error) {
      console.error('Error fetching YouTube comments:', error);
      throw new Error('Failed to fetch YouTube comments');
    }
  }
}
