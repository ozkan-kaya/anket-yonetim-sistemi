import { Component } from '@angular/core';
import { AnketCardList } from '../../components/anket-card-list/anket-card-list';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AnketCardList],
  templateUrl: './home.html',
})
export class Home { }
