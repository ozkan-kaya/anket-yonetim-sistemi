import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-soru-tip-3',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './soru-tip-3.html',
  styleUrls: ['./soru-tip-3.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SoruTip3),
      multi: true
    }
  ]
})
export class SoruTip3 implements ControlValueAccessor {
  @Input() soruId!: number;

  // Varsayilan 1-5 araligi
  scale = [1, 2, 3, 4, 5];
  value: number | null = null;
  isDisabled = false;

  onChangeFn = (value: any) => { };
  onTouchedFn = () => { };

  onRadioChange(val: number): void {
    this.value = val;
    this.onChangeFn(this.value);
    this.onTouchedFn();
  }

  writeValue(obj: any): void {
    this.value = obj;
  }

  registerOnChange(fn: any): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchedFn = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
