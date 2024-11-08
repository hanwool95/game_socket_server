import { Controller, Get, Param } from '@nestjs/common';
import { YoutubeService } from './youtube.service';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('')
  async getYoutube() {
    console.log('hello');
  }

  @Get('/video/:id')
  async getYoutubeVideoInfo(@Param('id') videoId: string) {
    const stats = await this.youtubeService.getVideoStats(videoId);

    // 댓글 목록 가져오기
    const comments = await this.youtubeService.getVideoComments(videoId);

    return { ...stats, comments };
  }
}
