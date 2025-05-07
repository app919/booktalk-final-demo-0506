const crypto = require('crypto');

const VERSION = '001';
const VERSION_LENGTH = 3;
const APP_ID_LENGTH = 24;

class ByteBuf {
    constructor() {
        this.buffer = [];
    }

    putBytes(bytes) {
        if (bytes instanceof Buffer) {
            this.buffer.push(...bytes);
        } else if (Array.isArray(bytes)) {
            this.buffer.push(...bytes);
        } else {
            throw new Error('Invalid bytes type');
        }
        return this;
    }

    putUint32(value) {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(value);
        this.buffer.push(...buf);
        return this;
    }

    putString(str) {
        const strBytes = Buffer.from(str);
        this.putUint32(strBytes.length);
        this.buffer.push(...strBytes);
        return this;
    }

    pack() {
        return Buffer.from(this.buffer);
    }
}

class ReadByteBuf {
    constructor(buffer) {
        this.buffer = buffer;
        this.position = 0;
    }

    getUint32() {
        const value = this.buffer.readUInt32BE(this.position);
        this.position += 4;
        return value;
    }

    getString() {
        const length = this.getUint32();
        const str = this.buffer.slice(this.position, this.position + length);
        this.position += length;
        return str;
    }

    getTreeMapUInt32() {
        const map = {};
        const size = this.getUint32();
        for (let i = 0; i < size; i++) {
            const key = this.getUint32();
            const value = this.getUint32();
            map[key] = value;
        }
        return map;
    }
}

class AccessToken {
    constructor(appID, appKey, roomID, userID) {
        this.appID = appID;
        this.appKey = appKey;
        this.roomID = roomID;
        this.userID = userID;
        this.nonce = Math.floor(Math.random() * 0xFFFFFFFF);
        this.issuedAt = Math.floor(Date.now() / 1000);
        this.expireAt = 0;
        this.privileges = {};
    }

    addPrivilege(privilege, expireAt) {
        this.privileges[privilege] = expireAt;
    }

    expireTime(expireAt) {
        this.expireAt = expireAt;
    }

    packMsg() {
        const buf = new ByteBuf();
        buf.putUint32(this.nonce);
        buf.putUint32(this.issuedAt);
        buf.putUint32(this.expireAt);
        buf.putString(this.roomID);
        buf.putString(this.userID);
        buf.putUint32(Object.keys(this.privileges).length);
        for (const [key, value] of Object.entries(this.privileges)) {
            buf.putUint32(parseInt(key));
            buf.putUint32(value);
        }
        return buf.pack();
    }

    serialize() {
        const bytesMsg = this.packMsg();
        const signature = crypto.createHmac('sha256', this.appKey).update(bytesMsg).digest();
        const content = new ByteBuf().putBytes(bytesMsg).putBytes(signature).pack();
        return VERSION + this.appID + content.toString('base64');
    }
}

const privileges = {
    PrivPublishStream: 1,
    PrivSubscribeStream: 2,
    PrivPublishAudio: 3,
    PrivPublishVideo: 4,
    PrivPublishScreen: 5
};

module.exports = {
    AccessToken,
    privileges
};
