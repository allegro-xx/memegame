const { Engine, World, Bodies, Events, Body, Runner } = Matter;

let engine, world, runner;
let boxes = [], boards = [], ball = null;
let drawBoardMode = false, startPos = null;

let targetWord = '';
let hitHistory = [];
let gameCleared = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  engine = Engine.create();
  world = engine.world;
  runner = Runner.create();
  Runner.run(runner, engine);

  // UI event handlers
  select('#modeButton').mousePressed(() => {
    drawBoardMode = !drawBoardMode;
    select('#modeButton').html(`板モード：${drawBoardMode ? 'ON' : 'OFF'}`);
  });
  select('#resetButton').mousePressed(() => {
    World.clear(world);
    Runner.stop(runner);
    clear();
    boxes = [];
    boards = [];
    ball = null;
    hitHistory = [];
    targetWord = '';
    gameCleared = false;
    setup();
  });
  select('#startButton').mousePressed(startGame);

  function startGame() {
    const word = select('#wordInput').value().trim();
    if (!word) {
      alert('ワードを入力してください');
      return;
    }
    targetWord = word;
    hitHistory = [];
    gameCleared = false;
    boxes = [];
    boards = [];
    ball = null;

    // Clear and restart physics
    World.clear(world);
    Runner.stop(runner);
    runner = Runner.create();
    Runner.run(runner, engine);

    // Arrange boxes: divide screen into segments and randomize positions for gameplay
    const segments = targetWord.length;
    const margin = width * 0.1;
    const segmentWidth = (width - margin * 2) / segments;

    for (let i = 0; i < segments; i++) {
      const c = targetWord[i];
      const x = margin + segmentWidth * i + random(0, segmentWidth);
      const y = random(height * 0.3, height * 0.7);
      boxes.push(new HiraganaBox(x, y, c));
    }
  }

  // Initial ground
  const ground = Bodies.rectangle(width/2, height+50, width, 100, { isStatic: true });
  World.add(world, ground);

  // Collision detection
  Events.on(engine, 'collisionStart', ev => {
    if (gameCleared) return;
    ev.pairs.forEach(p => {
      let hit = null;
      if (ball && p.bodyA === ball.body) hit = boxes.find(b => b.body === p.bodyB);
      if (ball && p.bodyB === ball.body) hit = boxes.find(b => b.body === p.bodyA);
      if (hit) {
        const char = hit.char;
        if (!hitHistory.includes(char)) {
          hitHistory.push(char);
        }
        speechSynthesis.speak(new SpeechSynthesisUtterance(char));
        if (hitHistory.join('') === targetWord) {
          gameCleared = true;
          const praise = new SpeechSynthesisUtterance(`すごい！ ${targetWord} が完成しました！`);
          speechSynthesis.speak(praise);
        }
      }
    });
  });
}

function draw() {
  background(255);
  boards.forEach(b => b.show());
  boxes.forEach(b => b.show());
  if (ball) ball.show();

  // Preview line
  if (startPos) {
    stroke(drawBoardMode ? '#f00' : '#000');
    strokeWeight(drawBoardMode ? Board.thickness : 2);
    line(startPos.x, startPos.y, mouseX, mouseY);
  }

  // Hit history display
  noStroke();
  fill(0);
  textSize(24);
  textAlign(LEFT, BOTTOM);
  text('履歴: ' + hitHistory.join('・'), 20, height - 20);
}

function mousePressed() {
  startPos = { x: mouseX, y: mouseY };
  if (!drawBoardMode) {
    if (!ball || ball.launched) {
      ball = new Ball(mouseX, mouseY, 20, true);
      // Reset history on new ball
      hitHistory = [];
    }
  }
}

function mouseReleased() {
  if (!startPos) return;
  const endPos = { x: mouseX, y: mouseY };
  if (drawBoardMode) {
    boards.push(new Board(startPos, endPos));
  } else {
    Body.setStatic(ball.body, false);
    const dx = endPos.x - startPos.x, dy = endPos.y - startPos.y;
    ball.launch({ x: dx * 0.001, y: dy * 0.001 });
    ball.launched = true;
  }
  startPos = null;
}

// Classes
class Ball {
  constructor(x, y, r, isStat=false) {
    this.r = r;
    this.body = Bodies.circle(x, y, r, { restitution: 0.9, isStatic: isStat });
    World.add(world, this.body);
    this.launched = false;
  }
  launch(force) {
    Body.applyForce(this.body, this.body.position, force);
  }
  show() {
    const p = this.body.position;
    push();
    fill(127);
    noStroke();
    ellipse(p.x, p.y, this.r * 2);
    pop();
  }
}

class HiraganaBox {
  constructor(x, y, char) {
    this.r = 40;
    this.char = char;
    this.body = Bodies.rectangle(x, y, this.r * 2, this.r * 2, {
      isStatic: true,
      restitution: 0.9
    });
    World.add(world, this.body);
  }
  show() {
    const p = this.body.position;
    push();
    fill(200, 200, 255);
    rectMode(CENTER);
    rect(p.x, p.y, this.r * 2, this.r * 2);
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text(this.char, p.x, p.y);
    pop();
  }
}

class Board {
  static thickness = 10;
  constructor(a, b) {
    this.len = dist(a.x, a.y, b.x, b.y);
    const angle = atan2(b.y - a.y, b.x - a.x);
    this.body = Bodies.rectangle(
      (a.x + b.x) / 2, (a.y + b.y) / 2,
      this.len, Board.thickness,
      { isStatic: true }
    );
    Body.setAngle(this.body, angle);
    World.add(world, this.body);
  }
  show() {
    const p = this.body.position;
    const a = this.body.angle;
    push();
    translate(p.x, p.y);
    rotate(a);
    rectMode(CENTER);
    fill(150);
    noStroke();
    rect(0, 0, this.len, Board.thickness);
    pop();
  }
}

