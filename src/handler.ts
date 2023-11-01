require('dotenv').config({ path: '.env' });
import serverlessExpress from '@vendia/serverless-express';
import axios from 'axios';
import cors from "cors";
import { ethers } from 'ethers';
import express from 'express';
import queryString from 'query-string';
import log4js from 'log4js';
export const logger = log4js.getLogger();
logger.level = 'debug';

import { UserModel } from './model/User';
import settings from './config/settings';

const app = express();
const router = express.Router();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

router.get("/hello", (_req, res, _next) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

router.post('/discord/connect', async (req, res) => {
  try {
    logger.info(req.query);
    logger.info(req.body);
    const code = req.body.code;
    const walletAddress = req.body.walletAddress;

    logger.info(`code: ${code}`);
    logger.info(`walletAddress: ${walletAddress}`);

    if (!walletAddress) {
      return res.status(400).json({ message: 'walletAddress is required'});
    }

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': '',
    };
    const botHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    }

    // ユーザーのアクセストークンを取得
    const params = {
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.BASE_URL,
    };
    const resToken = await axios.post('https://discord.com/api/v10/oauth2/token', queryString.stringify(params), { headers },);
    logger.info(resToken.data);
    headers.Authorization = `Bearer ${resToken.data.access_token}`;

    // ユーザIDを取得
    const resUser = await axios.get('https://discord.com/api/v10/users/@me', { headers });
    logger.info(resUser.data);
    const userId = resUser.data.id;
    const user = await UserModel.get(userId);
    if (!user) {
      await UserModel.create({
        discordId: userId,
        discordName: resUser.data.username,
        walletAddress,
      });
      logger.info('create new user done');
    } else {
      user.walletAddress = walletAddress;
      await user.save();
      logger.info('update user done');
    }

    // SampleNftを保持しているか確認
    const rpc = process.env.NODE_ENV === 'development' ? settings.rpc.polygonMumbai : settings.rpc.polygon;
    const addresses = process.env.NODE_ENV === 'development' ? settings.addresses.polygonMumbai : settings.addresses.polygon;
    const provider = new ethers.JsonRpcProvider(rpc);
    const abi = settings.abis.SampleNft;
    const contract = new ethers.Contract(addresses.SampleNft, abi, provider);
    const balance = await contract.balanceOf(walletAddress);
    logger.info(balance.toString());

    const guildId = process.env.DISCORD_GUILD_ID;
    const roleId = process.env.DISCORD_ROLE_ID as string;
    logger.info(`guildId: ${guildId}`);
    logger.info(`roleId: ${roleId}`);

    let resMember;
    try {
      // メンバー情報を取得
      resMember = await axios.get(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, { headers });
      logger.info(resMember.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logger.info('メンバーでないので招待します');

        const params = {
          access_token: resToken.data.access_token,
          roles: [] as string[],
        };
        if (balance > 0) {
          params.roles.push(roleId);
        }
        // サーバーにJoinさせる
        const ret = await axios.put(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, params, { headers: botHeaders });
        logger.info(ret.data);
        logger.info('Join done');
        // 改めてメンバー情報を取得
        resMember = await axios.get(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, { headers });
        logger.info(resMember.data);
      }
    }

    if (balance > 0) {
      // ロールがあるか確認
      if(resMember.data.roles.includes(roleId)) {
        logger.info('You have a roll!!');
      } else {
        // ロールがなければ付与
        const params = {
          roles: [roleId],
        };
        logger.info(params);
        const ret = await axios.patch(`https://discord.com/api/v10/guilds/${guildId}/members/${resMember.data.user.id}`, params, { headers: botHeaders });
        logger.info(ret.data);
        logger.info('add role done');
      }
    }

    return res.status(200).json({ message: 'ok'});
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ message: 'error'});
  }
});

router.use((_req, res, _next) => {
  return res.status(404).json({
    error: 'Not Found',
  });
});

app.use('/', router);

export const handler = serverlessExpress({ app });
