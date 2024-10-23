function tracked<T>(target: any, key: string) {
  let value: T;
  const getter = function () {
    return value;
  };
  const setter = function (newValue: T) {
    if (target.isTracking()) {
      console.log("Setting", key, newValue);
    }
    value = newValue;
  };
  Object.defineProperty(target, key, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true,
  });
}

class Temp {
  @tracked
  title: string;

  private tracking: boolean = false;

  constructor(title: string) {
    this.title = title;
    this.tracking = true;
  }

  public isTracking() {
    return this.tracking;
  }
}

const temp = new Temp("Hello");
console.log(temp.title);
temp.title = "World";
console.log(temp.title);
