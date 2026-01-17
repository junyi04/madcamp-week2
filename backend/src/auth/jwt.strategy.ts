import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET이 .env 파일에 정의되지 않았습니다.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Bearer 토큰 방식
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // 토큰의 페이로드에서 userId 꺼내 반환
  async validate(payload: any) {
    return {
      userId: payload.userId,
      githubId: payload.githubId
    };
  }
}