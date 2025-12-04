import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anket } from '../../interfaces/anket-interface';

@Component({
  selector: 'app-anket-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anket-card.html',
  styleUrl: './anket-card.css'
})
export class AnketCard {
  @Input() anket!: Anket;
  @Input() totalDepartments: number = 0;
  @Output() cardClick = new EventEmitter<Anket>();

  onCardClick(): void {
    this.cardClick.emit(this.anket);
  }

  get isExpired(): boolean {
    return !this.anket.status;
  }

  getDepartmentNames(): string {
    if (!this.anket.departmanlar) return '';

    return this.anket.departmanlar.map(dept => {
      if (typeof dept === 'string') {
        return dept;
      } else if (typeof dept === 'object' && dept !== null) {
        const d = dept as any;
        return d.departman_adi || d.name || d.title || '';
      }
      return '';
    }).filter(name => name).join(', ');
  }
}
