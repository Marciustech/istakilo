import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { LoginDto, RegistrationDto } from "./dto/auth-dto/index";
import { User, AtGuard, RtGuard } from "src/common/index";
import { FollowUserDto, ProfileDto, UserService } from "src/user/index";
import { PostDto } from "./dto";
import { CommentService } from "src/comment/comment.service";
import { LikesService } from "src/likes/likes.service";
import { AuthService } from "src/auth/auth.service";
@Controller()
export class GatewayController {
  private readonly postServiceClient: ApolloClient<unknown>;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private commentService: CommentService,
    private likesService: LikesService,
    config: ConfigService,
  ) {
    this.postServiceClient = new ApolloClient({
      uri: config.get("GRAPHQL_URL") || "http://localhost:3300/graphql",
      cache: new InMemoryCache(),
    });
  }

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: RegistrationDto) {
    return this.authService.signup(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AtGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@User() user: any) {
    return this.authService.logout(user);
  }

  @UseGuards(RtGuard)
  @Post("/refresh-token")
  refresh(@User() user: any) {
    return this.authService.refreshToken(user);
  }

  @UseGuards(AtGuard)
  @Post("user/follow")
  @HttpCode(HttpStatus.CREATED)
  follow(@User() user: any, @Body() dto: FollowUserDto) {
    return this.userService.follow(user, dto);
  }

  @UseGuards(AtGuard)
  @Post("user/unfollow")
  @HttpCode(HttpStatus.OK)
  unfollow(@User() user: any, @Body() dto: FollowUserDto) {
    return this.userService.unfollow(user, dto);
  }

  @UseGuards(AtGuard)
  @Put("user/profile")
  updateProfile(@User() user: any, @Body() dto: ProfileDto) {
    return this.userService.updateProfile(user, dto);
  }

  @Get("user/profile/:username")
  getProfile(@User() user: any, @Param("username") username: string) {
    return this.userService.getProfile(username);
  }

  @Get("post/hello")
  async getHello() {
    try {
      const { data } = await this.postServiceClient.query({
        query: gql`
          query {
            hello
          }
        `,
      });
      return data;
    } catch (error) {
      return error;
    }
  }

  @Get("post/user/:username")
  async getPostsByUser(@Param("username") username: string) {
    try {
      const { data } = await this.postServiceClient.query({
        query: gql`
          query {
            getAllPostsByUser(username: ${JSON.stringify(username)}) {
              postId
              ownerId
              ownerUserName
              imageListUri
              description
              createdAt
            }
          }
        ` /*context: {
          headers: {
            "Authorization": req.headers.authorization,
          },
        },*/,
      });

      return data.getAllPostsByUser;
    } catch (error) {
      return { error };
    }
  }

  @Post("post/create/")
  async createPost(@Req() req: Request, @Body() postInput: PostDto) {
    try {
      const imgArray = postInput.imageUrlsList
        .split(",")
        .map((eachURL) => eachURL.trim());
      const { data } = await this.postServiceClient.mutate({
        mutation: gql`
          mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              postId
              ownerId
              ownerUserName
              description
              imageListUri
              createdAt
              likes
            }
          }
        `,
        variables: {
          input: {
            ownerId: postInput.ownerId,
            ownerUserName: postInput.username,
            imageListUri: imgArray,
            description: postInput.description,
          },
        },
        context: {
          Headers: {
            Authorization: req.headers.authorization,
          },
        },
      });

      return data;
    } catch (error) {
      return { error };
    }
  }

  @Post("comments/create")
  async newComment(@Body() postInput: any) {
    return this.commentService.createComment(postInput);
  }

  @Get("comments/post/:postId")
  async getAllCommentsByPostId(@Param("postId") postId: string) {
    return this.commentService.getAllCommentsByPostId(postId);
  }

  @Get("comments/user/:userId")
  async getAllCommentsByUserId(@Param("userId") userId: string) {
    return this.commentService.getAllCommentsByUserId(userId);
  }

  @Post("comments/answer")
  async answerComment(@Body() commentInput: any) {
    return this.commentService.answerComment(commentInput);
  }

  @Get("likes/all")
  async allLikes() {
    return {
      commentLikes: await this.likesService.getAllPostLikes(),
      postLikes: await this.likesService.getAllCommentLikes(),
    };
  }

  @Post("likes/like-post")
  async likePost(@Body() likeInput: any) {
    return this.likesService.likePost(likeInput);
  }

  @Post("likes/unlike-post")
  async unlikePost(@Body() unlikeInput: any) {
    return this.likesService.unlikePost(unlikeInput);
  }

  @Post("likes/like-comment")
  async likeComment(@Body() likeInput: any) {
    return this.likesService.likeComment(likeInput);
  }

  @Post("likes/unlike-comment")
  async unlikeComment(@Body() unlikeInput: any) {
    return this.likesService.unlikeComment(unlikeInput);
  }
}
