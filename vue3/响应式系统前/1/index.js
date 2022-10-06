const data = {
  name: "august",
  age: 24,
};

const _data = new Proxy(data, {
  set(target, key, newVal) {
    target[key] = newVal;

    document.getElementById("p1").innerText = newVal;
  },
});

//  控制台里执行_data.age += 1看看