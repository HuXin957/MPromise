class MPromise {
  static PENDING = "pending";
  static FULLFILED = "fullfiled";
  static REJECTED = "rejected";

  constructor(executor) {
    this.status = MPromise.PENDING;
    this.value = null;
    this.callbacks = [];

    try {
      executor(this._resolve.bind(this), this._reject.bind(this));
    } catch (err) {
      this._reject(err);
    }
  }

  static resolve(value) {
    return new MPromise((resolve) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new MPromise((_, reject) => {
      reject(reason);
    });
  }

  static all(promises) {
    let values = [];
    return new MPromise((resolve, reject) => {
      promises.forEach((promise) => {
        promise.then(
          (res) => {
            values.push(res);

            if (values.length === promises.length) {
              resolve(values);
            }
          },
          (reason) => {
            reject(reason);
          }
        );
      });
    });
  }

  static race(promises) {
    return new MPromise((resolve, reject) => {
      promises.forEach((promise) => {
        promise.then((val) => {
          resolve(val);
        });
      });
    });
  }

  _resolve(value) {
    if (this.status === MPromise.PENDING) {
      this.status = MPromise.FULLFILED;
      this.value = value;
      setTimeout(() => {
        this.callbacks.forEach((callback) => {
          // 将resolve时用户传进来的value传递给then的onResolve
          callback.onResolve(value);
        });
      });
    }
  }

  _reject(reason) {
    if (this.status === MPromise.PENDING) {
      this.status = MPromise.REJECTED;
      this.value = reason;
      setTimeout(() => {
        this.callbacks.forEach((callback) => {
          // 将reject时用户传进来的value传递给then的onReject
          callback.onReject(reason);
        });
      });
    }
  }

  _parse(promise, result, resolve, reject) {
    if (promise === result) {
      throw new TypeError("Chaining cycle detected for promise");
    }

    try {
      if (result instanceof MPromise) {
        result.then(resolve, reject);
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  }

  then(onResolve, onReject) {
    if (typeof onResolve !== "function") {
      onResolve = () => null;
    }

    if (typeof onReject !== "function") {
      onReject = () => null;
    }

    const promise = new MPromise((resolve, reject) => {
      //如果Promise是通过异步的方式改变状态，此时到then就是PENDING状态
      if (this.status === MPromise.PENDING) {
        this.callbacks.push({
          onResolve: (value) =>
            this.parse(promise, onResolve(value), resolve, reject),
          onReject: (reason) =>
            this.parse(promise, onReject(reason), resolve, reject),
        });
      }

      if (this.status === MPromise.FULLFILED) {
        setTimeout(() =>
          this.parse(promise, onResolve(this.value), resolve, reject)
        );
      }

      if (this.status === MPromise.REJECTED) {
        setTimeout(() => {
          this.parse(promise, onReject(this.value), resolve, reject);
        });
      }
    });

    return promise;
  }
}
