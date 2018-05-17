let vm = new Vue({
  el: "#app",
  delimiters: ['${', '}'],
  data: {
    epochCounter: 0,
    nombreRoom: "",
    nn: "",
    len: 784,
    totalData: 1000,    
    socket: "",
    puntaje: "",
    labels :
    [
      {
        nombre: "gato",
        valor: 0,
        dataRaw: "",
        data: {}
      },
      {
        nombre: "tren",
        valor: 1,
        dataRaw: "",
        data: {}
      },
      {
        nombre: "arcoiris",
        valor: 2,
        dataRaw: "",
        data: {}
      },
      {
        nombre: "pajaro",
        valor: 3,
        dataRaw: "",
        data: {}
      },
      {
        nombre: "estrella",
        valor: 4,
        dataRaw: "",
        data: {}
      }
    ],
    training: [],
    testing: [],
    score: 0,
    nombreDibujo: "",
    usuarios: "",
    msg: "",
    isTrained: false,
    porcentajeExito: "",
    mensajes: [],
    tipoDibujo: [
      {
        tipo:"gato",
        valor: 0
      },
      {
        tipo:"tren",
        valor: 1
      },
      {
        tipo:"arcoiris",
        valor: 2
      },
      {
        tipo:"pajaro",
        valor: 3
      },
      {
        tipo:"estrella",
        valor: 4
      }
    ]
  },
  methods: {
    enviarScore() {
      this.socket.emit("puntaje", this.puntaje);
    },
    prepareData (category, data, label) {
      category.training = [];
      category.testing = [];
      for (let i = 0; i < this.totalData; i++) {
        let offset = i * this.len;
        let threshold = floor(0.8 * this.totalData);
        if (i < threshold) {
          category.training[i] = data.bytes.subarray(offset, offset + this.len);
          category.training[i].label = label;
        } else {
          category.testing[i - threshold] = data.bytes.subarray(offset, offset + this.len);
          category.testing[i - threshold].label = label;
        }
      }
    },
    trainEpoch () {
      shuffle(this.training, true);
      for (let i = 0; i < this.training.length; i++) {
        let data = this.training[i];
        let inputs = Array.from(data).map(x => x / 255);
        let label = this.training[i].label;
        let targets = [0, 0, 0, 0, 0];
        targets[label] = 1;
        this.nn.train(inputs, targets);
      }
    },
    testAll () {
      let correct = 0;
      // Train for one epoch
      for (let i = 0; i < this.testing.length; i++) {
        let data = this.testing[i];
        let inputs = Array.from(data).map(x => x / 255);
        let label = this.testing[i].label;
        let guess = this.nn.predict(inputs);

        let m = max(guess);
        let classification = guess.indexOf(m);

        if (classification === label) {
          correct++;
        }
      }
      let percent = 100 * correct / this.testing.length;
      return percent;
    },
    loadNeuralNetwork () {
      if( localStorage.getItem("nn") ){
        this.nn = NeuralNetwork.deserialize(localStorage.getItem("nn"));    
        this.isTrained = true;
      }else{
        // Making the neural network      
        this.nn = new NeuralNetwork(784, 64, this.labels.length);    
      }
    },
    train () {
      swal({
        closeOnClickOutside: false,
        title: "¿Deseas entrenar la red neuronal?",
        text: "Se entrenará la red neuronal. El navegador suele tardar en reaccionar al entrenarla. No desesperes",
        buttons: {
          entrenar: "Entrenar",
          cerrar: {
            closeModal: true,
            text: "Cancelar",
            value: null,
            className: "swal-button--danger"
          }
        }
      })
      .then((entrenar) => {
        if (entrenar) {
          this.trainEpoch();
          this.epochCounter++;
          const dataTrain = this.nn.serialize();
          localStorage.removeItem("nn");
          localStorage.setItem("nn", dataTrain);
          console.log("Epoch: " + this.epochCounter);
        }
      });
      
    },
    test () {
      swal({
        closeOnClickOutside: false,
        title: "¿Deseas testear la red neuronal?",
        text: "¡Se obtendrá el porcentaje de éxito de tu neurona!. El navegador suele tardar en reaccionar al testearla. No desesperes",
        buttons: {
          test: "Testear",
          cerrar: {
            closeModal: true,
            text: "Cancelar",
            className: "swal-button--danger",
            value: null,
          }
        }
      })
      .then((test) => {
        if (test) {
          let percent = this.testAll(this.testing);
          this.porcentajeExito = nf(percent, 2, 2) + "%";
          console.log("Percent: " + nf(percent, 2, 2) + "%");
        }
      });      
    },
    clearCanvas () {
      background(255);
      this.nombreDibujo = "";
    },
    guess () {
      let inputs = [];
      let img = get();
      img.resize(28, 28);
      img.loadPixels();
      for (let i = 0; i < this.len; i++) {
        let bright = img.pixels[i * 4];
        inputs[i] = (255 - bright) / 255.0;
      }
  
      let guess = this.nn.predict(inputs);
      let m = max(guess);
      let classification = guess.indexOf(m);
      // console.log(classification);
      this.playGame(classification);
      this.nombreDibujo = "";
    },
    playGame (type) {
      console.log(type);
      let isError = true;
      if(type === this.tipoDibujo[0].valor){
        console.log(this.tipoDibujo[0].tipo);
        this.score++;
        this.clearCanvas();
        shuffle(this.tipoDibujo, true)
        // console.log(this.tipoDibujo)
        isError = false
        this.socket.emit('updateScore', this.score, (res) => {
          console.log(res);
        });
      }      

      if(isError) {
        this.score--;
        this.socket.emit('updateScore', this.score);
      }
    },
    guessPress () {
      let inputs = [];
      let img = get();
      img.resize(28, 28);
      img.loadPixels();
      for (let i = 0; i < this.len; i++) {
        let bright = img.pixels[i * 4];
        inputs[i] = (255 - bright) / 255.0;
      }
  
      let guess = this.nn.predict(inputs);
      let m = max(guess);
      let classification = guess.indexOf(m);

      switch (classification) {
        case 0:
          this.nombreDibujo = "Es un gato!";
        break;
        case 1:
          this.nombreDibujo = "Es un tren!";          
        break;
        case 2:
          this.nombreDibujo = "Es un arcoiris!";          
        break;
        case 3:
          this.nombreDibujo = "Es un pájaro!";          
        break;
        case 4:
          this.nombreDibujo = "Es una estrella!";          
        break;
        default:
          this.nombreDibujo = "NO se que es :c!";
        break;
      }
    },
    scrollChat () {
      
    },
    logout () {
      localStorage.removeItem("room");
      localStorage.removeItem("username");
      window.location.href = '/login'; 
    }
  },
  mounted() {
    this.socket = io();
    let params = {};
    params.room = localStorage.getItem("room");
    params.name = localStorage.getItem("username");
    this.nombreRoom = params.room;

    this.socket.on('connect', () => {
      
      this.socket.emit('join', params ,(err) =>{
        if(err){
          console.log(err)

          swal({
            closeOnClickOutside: false,
            title: "¡No puedes estar aquí!",
            text: err,
            button: "Salir"
          })
          .then((test) => {
            this.logout();
          });               
        }else{
          swal({
            closeOnClickOutside: false,
            title: "¡Bienvenido al room "+ params.room +"!",
            text: "Si es tu primera vez juganzo, por favor entrena a la red neuronal para iniciar",
            button: "Ok"
          })          
          this.socket.emit('roomie', params, () => {});
        }
      });
    });

    this.socket.on('disconnect',() => {
      console.log('servidor desconectado');
    });

    this.socket.on('updateUserList', (users) => {
      this.usuarios = users;
      console.log(users)
    });

    this.socket.on('winner', (msg) => {
      this.mensajes.push(msg);
      this.scrollChat();
      if(this.score !== msg.score ){
        swal({
          title: "Eliminado por " + msg.from + ", score: " + msg.score,
          text: "¡Perdiste, prueba suerte en otra sesión!",
          icon: "error",
          button: "Salir"
        })
        .then((willDelete) => {
          this.logout();
        });
        return;
      }
      swal({
        title: "1# Victory Royal!",
        text: "¡Eres un Dios de los dibujos!",
        icon: "success",
        button: "Salir"
      })
      .then((willDelete) => {
        this.logout();
      });
    });

    this.socket.on('newMensaje', (msg) => {
      this.mensajes.push(msg);
      this.scrollChat();
    });

    this.socket.on('newScoreUser',  (msg) => {
      this.mensajes.push(msg);
      this.scrollChat();
    });
  }
});

let nn;

function preload() {
  vm.loadNeuralNetwork();

  vm.labels[0].dataRaw = loadBytes('data/cats1000.bin');
  vm.labels[1].dataRaw = loadBytes('data/trains1000.bin');
  vm.labels[2].dataRaw = loadBytes('data/rainbows1000.bin');
  vm.labels[3].dataRaw = loadBytes('data/bird1000.bin');
  vm.labels[4].dataRaw = loadBytes('data/star1000.bin');
}


function setup() {
  const cv = createCanvas(windowHeight/100*60, windowHeight/100*60);
  // console.log(windowHeight/100*60);
  // console.log(displayHeight/100*.60);
  cv.parent('sketch-holder');
  background(255);

  for (let i = 0; i < vm.labels.length; i++) {
    vm.prepareData(vm.labels[i].data, vm.labels[i].dataRaw, vm.labels[i].valor)    
  }

  let training = [];
  let testing = [];

  for (let x = 0; x < vm.labels.length; x++) {
    training = training.concat(vm.labels[x].data.training);
    testing = testing.concat(vm.labels[x].data.testing);
  }  

  vm.training = training;
  vm.testing = testing;
  
}

function draw() {
  strokeWeight(8);
  stroke(0);
  /* WIDTH HEIGHT */
  if (mouseIsPressed && (pmouseY <= width) && (pmouseY > 0) && (pmouseX <= height) && (pmouseX > 0)) {
    line(pmouseX, pmouseY, mouseX, mouseY);
    console.log("here!")
    vm.guessPress();
  }
}


