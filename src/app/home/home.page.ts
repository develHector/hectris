import { Component, DebugElement } from '@angular/core';
import { debug } from 'util';
import { SelectMultipleControlValueAccessor } from '@angular/forms';

export class Cell {
  background_color: string;
  border_color: string;
  constructor(background_color: string, border_color: string) {
    let self: Cell = this;
    self.background_color = background_color;
    self.border_color = border_color;
  }
}

export class Punto {
  x: number;
  y: number;
  constructor(i: Punto) {
    let self: Punto = this;
    self.x = i.x;
    self.y = i.y;
  }
}

export class Block {
  x: number;
  y: number;
  base: Array<Punto>;
  color: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  cells: Cell[][] = [];
  timer: any = null;
  Score: number = 0;
  HiScore: number = 0;
  Speed: number = 1601; // 50 levels + 1 ms

  static MAX: number = 20;
  static MAY: number = 10;

  DefaultCell: Cell = { background_color: 'black', border_color: 'rgb(1, 1, 1)' };

  blocks: Block[] = [
    { x: 0, y: 4, base: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], color: 'crimson' }, // o
    { x: 0, y: 4, base: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }], color: 'blue' }, // J
    { x: 0, y: 4, base: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }], color: 'darkorange' }, // L
    { x: 0, y: 5, base: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }], color: 'yellow' }, // I
    { x: 0, y: 4, base: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }], color: 'fuchsia' }, // Z
    { x: 0, y: 4, base: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 2 }], color: 'lime' }, // S
    { x: 0, y: 4, base: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }], color: 'cyan' }, // T
  ];

  active: Block = { x: 0, y: 0, base: [], color: "" };

  constructor() {
    let self: HomePage = this;
    self.InitBoard();
  }



  // initialize the whole X*Y board
  InitBoard() {
    let self: HomePage = this;

    for (let i = 0; i < HomePage.MAX; i++) {
      self.cells[i] = [];
      for (let j = 0; j < HomePage.MAY; j++) {
        self.cells[i][j] = new Cell(self.DefaultCell.background_color, self.DefaultCell.border_color);
      }
    }
    this.HiScore = parseInt(window.localStorage.getItem("Hectis.HiScore") || "0");
  }

  // present a radngm figure
  GetNewFigure() {
    let self: HomePage = this;

    // do not repeat the previous figure
    let count = 0;
    let figure: Block;
    do {
      let rnd = Math.floor(Math.random() * Math.floor(self.blocks.length));
      figure = self.blocks[rnd];
    } while (figure.color === self.active.color && ++count < 3);

    // check if board is overloaded to end the game
    for (let i of figure.base) {
      if (self.cells[i.x + figure.x][i.y + figure.y].background_color !== self.DefaultCell.background_color) {
        clearInterval(self.timer);
        self.timer = null;
        return;
      }
    }

    // set and move down
    self.active = { x: figure.x, y: figure.y, base: figure.base.map(i => new Punto(i)), color: figure.color } as Block;
    self.Move(false, i => figure.base);

  }

  // remove completed rows and make upper ones fall down
  RemoveCompleteRows(): boolean {
    let self: HomePage = this;

    let CompleteRows: Array<number> = [];
    for (let i = 0; i < HomePage.MAX; i++) {
      let CompleteCells = 0;
      for (let j = 0; j < HomePage.MAY; j++) {
        if (self.cells[i][j].background_color !== self.DefaultCell.background_color) {
          CompleteCells++;
        }
      }
      if (CompleteCells >= HomePage.MAY) CompleteRows.push(i);
    }

    if (CompleteRows.length) {

      // quickly "blink" what is going to be removed
      for (let i of CompleteRows) {
        for (let j = 0; j < HomePage.MAY; j++) {
          self.cells[i][j] = new Cell('white', 'white');
        }
      }

      // register exponential-by-rows score 
      this.Score += (Math.pow(CompleteRows.length, 2) * 4);

      // increase the speed a little bit
      this.Speed -= 32;
      if (this.Score > this.HiScore) {
        this.HiScore = this.Score;
        window.localStorage.setItem("Hectis.HiScore", this.HiScore.toString());
      }

      // a moment from now, make the rest fall down (this is to allow the blink to be visible without sleeps)
      setTimeout(() => {
        for (let c of CompleteRows) {
          for (let i = c; i > 0; i--) {
            for (let j = 0; j < HomePage.MAY; j++) {
              let upperCell = self.cells[i - 1][j];
              self.cells[i][j] = new Cell(upperCell.background_color, upperCell.border_color);
            }
          }
        }
        self.GetNewFigure();
      }, this.Speed / 10);
      return true;
    }

    return false;
  }

  // Einstein showed Newton was wrong about gravity
  Gravity() {
    let self: HomePage = this;
    let fin = self.Move(true, i => i.x++);
    if (fin) {
      if (!self.RemoveCompleteRows()) {
        self.GetNewFigure();
      }
    }
  }

  // base method to move the active figure across the board on "lambda-movement" with collission checking
  // note: it would be much more nice if it worked on a per-difference or incremental mode moving/cecking only what needed and not the whole figure, but comon guys, a day has only 24 hours
  Move(gravity: boolean, lambda: (x: Block) => void): boolean {
    let self: HomePage = this;

    // generate a copy of the block place that copy on the intended position using the lambda instruction
    let copy: Block = { x: self.active.x, y: self.active.y, base: self.active.base.map(i => new Punto(i)), color: self.active.color };    
    lambda(copy);

    // make invisible current block to avoid self collissions
    for (let i of self.active.base) {
      self.cells[i.x + self.active.x][i.y + self.active.y] = new Cell(self.DefaultCell.background_color, self.DefaultCell.border_color);
    }

    // check if the copied block is got to the bottom or collides with something
    let bottom: boolean = false; let collision: boolean = false;
    for (let i of copy.base) {
      let x = i.x + copy.x;
      let y = i.y + copy.y;
      if (x >= HomePage.MAX || y < 0 || y >= HomePage.MAY || self.cells[x][y].background_color !== self.DefaultCell.background_color) {
        if (gravity) {
          bottom = true;
          break;
        } else {
          collision = true;
          break;
        }
      }
    }

    // if all clear convert the copied block in the active one
    if (!bottom && !collision) {
      self.active.x = copy.x;
      self.active.y = copy.y;
      self.active.base = copy.base.map(i => new Punto(i))
    }

    // make active block visible
    for (let i of self.active.base) {
      self.cells[i.x + self.active.x][i.y + self.active.y] = new Cell(self.active.color, self.active.color);
    }

    // if block hits bottom create a new figure
    return bottom;
  }

  // button event (click)
  OnStartStop() {
    let self: HomePage = this;
    self.InitBoard();
    self.GetNewFigure();
    self.timer = setInterval(() => self.Gravity(), this.Speed);
  }

  // button event (click)
  Rotate() {
    let self: HomePage = this;

    // 90° rotate algorithm (simple matrix algebra)
    self.Move(false, i => {
      let maxx = Math.max.apply(null, i.base.map(i => i.x));
      let maxy = Math.max.apply(null, i.base.map(i => i.y));
      let max = Math.max(maxx, maxy);
      i.base.forEach(j => {
        let prevy = j.y;
        j.y = max - j.x;
        j.x = prevy;
      });
    });

  }

  // button event (click)
  MoveDown() {
    let self: HomePage = this;
    while (!self.Move(true, i => i.x++)) { }
    clearInterval(self.timer);
    self.timer = null;
    self.RemoveCompleteRows();
    self.timer = setInterval(() => self.Gravity(), this.Speed);
  }

  // button event (click)
  MoveLeft() {
    let self: HomePage = this;
    self.Move(false, i => i.y--);
  }

  // button event (click)
  MoveRight() {
    let self: HomePage = this;
    self.Move(false, i => i.y++);
  }




}
