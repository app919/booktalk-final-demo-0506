const express = require('express');
const cors = require('cors');
const { AccessToken, privileges } = require('./AccessToken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const APP_ID = process.env.APP_ID;
const APP_KEY = process.env.APP_KEY;

// 打印配置信息（注意不要在生产环境打印敏感信息）
console.log('Server Configuration:');
console.log('APP_ID:', APP_ID ? '已配置' : '未配置');
console.log('APP_KEY:', APP_KEY ? '已配置' : '未配置');

app.post('/token', (req, res) => {
    try {
        const { roomId, userId } = req.body;
        
        console.log('收到token请求:', { roomId, userId });
        
        if (!roomId || !userId) {
            console.log('参数错误: roomId和userId是必需的');
            return res.status(400).json({ error: 'roomId and userId are required' });
        }

        if (!APP_ID || !APP_KEY) {
            console.log('服务器配置错误: APP_ID或APP_KEY未设置');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = new AccessToken(APP_ID, APP_KEY, roomId, userId);
        
        // 添加权限，24小时过期
        const expireTime = Math.floor(Date.now() / 1000) + (24 * 3600);
        token.addPrivilege(privileges.PrivSubscribeStream, expireTime);
        token.addPrivilege(privileges.PrivPublishStream, expireTime);
        token.expireTime(expireTime);

        const tokenStr = token.serialize();
        console.log('生成的token:', tokenStr.substring(0, 50) + '...');
        
        res.json({ token: tokenStr });
    } catch (error) {
        console.error('Token生成错误:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Token服务器运行在端口 ${PORT}`);
    console.log(`请确保前端配置了正确的token服务器地址: http://localhost:${PORT}`);
}); 