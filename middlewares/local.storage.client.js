const stroage = {};

class LocalStorageClient {
  constructor() {
    this._id = Math.random().toString(36).slice(-8) + new Date().getTime();
  }

  remove(sid) {
    delete stroage[sid];
  }

  update(sid, data) {
    stroage[sid] = data;
  }

  set(id, data) {
    let result;
    if (id) {
      const session = this.get(id);
      if (session) {
        result = this.update(id, data);
      } else {
        result = this.add(data);
      }
    } else {
      result = this.add(data);
    }
    return result;
  }

  add(data) {
    stroage[this._id] = data;
    return {_id: this._id};
  }

  get(sid) {
    const now = new Date();
    if (stroage[sid]) {
      return now > stroage[sid].expiredDate ? null : {_id: this._id, data: stroage[sid]};
    } else {
      return null;
    }
  }
}

module.exports = LocalStorageClient;
