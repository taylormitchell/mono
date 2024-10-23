class Temp {
  title: string;

  constructor(title: string) {
    this.title = title;
    makeTracking(this);
  }
}

function makeTracking<T>(target: T, props?: (keyof T)[]) {
  if (props) {
    props.forEach((prop) => {
      track(target, prop);
    });
  } else {
    Object.keys(target).forEach((key) => {
      track(target, key as keyof T);
    });
  }
}

function track<T>(target: T, key: keyof T) {
  let _value = target[key];
  Object.defineProperty(target, key, {
    get: () => _value,
    set: (v) => {
      console.log("Setting", key, v);
      _value = v;
    },
  });
}

const temp = new Temp("Hello");
console.log(temp.title);
temp.title = "World";
console.log(temp.title);
