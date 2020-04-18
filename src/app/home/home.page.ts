import { Component, DebugElement } from '@angular/core';
import { debug } from 'util';
import { SelectMultipleControlValueAccessor } from '@angular/forms';

export class Celda {
  background_color: string;
  border_color: string;
  constructor(background_color: string, border_color: string) {
    let self: Celda = this;
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

export class Figura {
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

  cells: Celda[][] = [];
  timer: any = null;
  Score: number = 0;
  HiScore: number = 0;
  Velocidad: number = 1601; // 50 niveles+1ms

  static MAX: number = 20;
  static MAY: number = 10;

  CeldaDefault: Celda = { background_color: 'black', border_color: 'rgb(1, 1, 1)' };

  figuras: Figura[] = [
    { x: 0, y: 4, base: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], color: 'crimson' }, // o
    { x: 0, y: 4, base: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }], color: 'blue' }, // J
    { x: 0, y: 4, base: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }], color: 'darkorange' }, // L
    { x: 0, y: 5, base: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }], color: 'yellow' }, // I
    { x: 0, y: 4, base: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }], color: 'fuchsia' }, // Z
    { x: 0, y: 4, base: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 2 }], color: 'lime' }, // S
    { x: 0, y: 4, base: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }], color: 'cyan' }, // T
  ];

  activa: Figura = { x: 0, y: 0, base: [], color: "" };

  constructor() {
    let self: HomePage = this;
    self.InitBoard();    
  }

  OnStartStop() {
    let self: HomePage = this;
    self.InitBoard();
    self.ObtenerNuevaFigura();
    self.timer = setInterval(() => self.Gravity(), this.Velocidad);
  }

  // inicializamos en blanco el board completo
  InitBoard() {
    let self: HomePage = this;

    for (let i = 0; i < HomePage.MAX; i++) {
      self.cells[i] = [];
      for (let j = 0; j < HomePage.MAY; j++) {
        self.cells[i][j] = new Celda(self.CeldaDefault.background_color, self.CeldaDefault.border_color);
      }
    }
    this.HiScore = parseInt(window.localStorage.getItem("Hectis.HiScore") || "0");
  }

  // rutina que dibuja figura al azar al principio
  ObtenerNuevaFigura() {
    let self: HomePage = this;

    // hacemos porque no se repita la misma que la anterior    
    let cuenta = 0;
    let nueva: Figura;
    do {
      let rnd = Math.floor(Math.random() * Math.floor(self.figuras.length));
      nueva = self.figuras[rnd];
    } while (nueva.color === self.activa.color && ++cuenta < 3);

    // vemos si no se topó el board
    for (let i of nueva.base) {
      if (self.cells[i.x + nueva.x][i.y + nueva.y].background_color !== self.CeldaDefault.background_color) {
        clearInterval(self.timer);
        self.timer = null;
        return;
      }
    }

    // no solo metemos los puntos en el resultado, sino que los pintamos    
    self.activa = { x: nueva.x, y: nueva.y, base: nueva.base.map(i => new Punto(i)), color: nueva.color } as Figura;
    self.Move(false, i => nueva.base);

  }

  RemoveCompleteRows(): boolean {
    let self: HomePage = this;

    let CompleteRows: Array<number> = [];
    for (let i = 0; i < HomePage.MAX; i++) {
      let CompleteCells = 0;
      for (let j = 0; j < HomePage.MAY; j++) {
        if (self.cells[i][j].background_color !== self.CeldaDefault.background_color) {
          CompleteCells++;
        }
      }
      if (CompleteCells >= HomePage.MAY) CompleteRows.push(i);
    }

    if (CompleteRows.length) {

      // resaltamos un momento lo que va a eliminarse
      for (let i of CompleteRows) {
        for (let j = 0; j < HomePage.MAY; j++) {
          self.cells[i][j] = new Celda('white', 'white');
        }
      }

      // registramos el score exponencial por líneas
      this.Score += (Math.pow(CompleteRows.length, 2) * 4);

      // incrementamos la velocidad por evento (con independencia al número de líneas, para fomentar las mas posibles por evento)
      this.Velocidad -= 32;
      if (this.Score > this.HiScore) {
        this.HiScore = this.Score;
        window.localStorage.setItem("Hectis.HiScore", this.HiScore.toString());
      }

      // hacemos bajar todo lo de arriba
      setTimeout(() => {
        for (let c of CompleteRows) {
          for (let i = c; i > 0; i--) {
            for (let j = 0; j < HomePage.MAY; j++) {
              let upperCell = self.cells[i - 1][j];
              self.cells[i][j] = new Celda(upperCell.background_color, upperCell.border_color);
            }
          }
        }
        self.ObtenerNuevaFigura();
      }, this.Velocidad/10);
      return true;
    }

    return false;
  }


  Rotate() {
    let self: HomePage = this;

    // algoritmo de giro 90° de matriz
    self.Move(false, i => {
      let maxx = Math.max.apply(null, i.base.map(i => i.x));
      let maxy = Math.max.apply(null, i.base.map(i => i.y));
      let max = Math.max( maxx, maxy) ;
      i.base.forEach(j => {
        let prevy = j.y;
        j.y = max - j.x;
        j.x = prevy;
      });
    });

  }

  Gravity() {
    let self: HomePage = this;
    let fin = self.Move(true, i => i.x++);
    if (fin) {
      if (!self.RemoveCompleteRows()) {
        self.ObtenerNuevaFigura();
      }
    }
  }

  MoveDown() {
    let self: HomePage = this;
    while (!self.Move(true, i => i.x++)) { }
    clearInterval(self.timer);
    self.timer = null;
    self.RemoveCompleteRows();
    self.timer = setInterval(() => self.Gravity(), this.Velocidad);
  }

  MoveLeft() {
    let self: HomePage = this;
    self.Move(false, i => i.y--);
  }

  MoveRight() {
    let self: HomePage = this;
    self.Move(false, i => i.y++);
  }

  Move(gravity: boolean, operator: (x: Figura) => void): boolean {
    let self: HomePage = this;

    let copia: Figura = { x: self.activa.x, y: self.activa.y, base: self.activa.base.map(i => new Punto(i)), color: self.activa.color };
    operator(copia);

    for (let i of self.activa.base) {
      self.cells[i.x + self.activa.x][i.y + self.activa.y] = new Celda(self.CeldaDefault.background_color, self.CeldaDefault.border_color);
    }

    let fin: boolean = false;
    let valid: boolean = true;
    for (let i of copia.base) {
      let x = i.x + copia.x;
      let y = i.y + copia.y;
      if (x >= HomePage.MAX || y < 0 || y >= HomePage.MAY || self.cells[x][y].background_color !== self.CeldaDefault.background_color) {
        if (gravity) {
          fin = true;
          break;
        } else {
          valid = false;
          break;
        }
      }
    }

    if (!fin && valid) {
      self.activa.x = copia.x;
      self.activa.y = copia.y;
      self.activa.base = copia.base.map(i => new Punto(i))
    }

    for (let i of self.activa.base) {
      self.cells[i.x + self.activa.x][i.y + self.activa.y] = new Celda(self.activa.color, self.activa.color);
    }

    return fin;
  }

}
