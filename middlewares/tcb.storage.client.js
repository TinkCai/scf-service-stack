const tcb = require('@cloudbase/node-sdk');

class TCBStorageClient {
  constructor(secretId, secretKey, envId, collectionName) {
    this.cloud = tcb.init({
      secretId: secretId,
      secretKey: secretKey,
      env: envId,
    });
    this.collectionName = collectionName;
    this.db = this.cloud.database();
    this._ = this.db.command;
  }

  async update(sid, data) {
    const result = await this.db
      .collection(this.collectionName)
      .doc(sid)
      .update({data: this._.set(data)});
    if (result.updated === 1) {
      return {_id: sid};
    } else {
      return {};
    }
  }

  async remove(sid) {
    await this.db.collection(this.collectionName).doc(sid).remove();
  }

  async set(id, data) {
    let result;
    if (id) {
      // is the session expired
      const _prevSession = await this.get(id);
      if (_prevSession) {
        result = await this.update(id, data);
      } else {
        result = await this.add(data);
        result._id = result.id;
      }
    } else {
      result = await this.add(data);
      result._id = result.id;
    }
    return result;
  }

  async add(data) {
    return await this.db.collection(this.collectionName).add({ data });
  }

  async get(sid) {
    const now = new Date();
    try {
      const res = await this.db.collection(this.collectionName).doc(sid).get();
      if (res.data && res.data.length > 0) {
        return now > res.data[0].data.expiredDate ? null : res.data[0];
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
}

module.exports = TCBStorageClient;
