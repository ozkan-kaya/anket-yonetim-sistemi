import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { SoruSecenegi } from '../../../interfaces/anket-interface';

@Component({
    selector: 'app-soru-tip-2',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './soru-tip-2.html',
    styleUrls: ['./soru-tip-2.css'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SoruTip2),
            multi: true
        }
    ]
})
export class SoruTip2 implements ControlValueAccessor {
    @Input() soruSecenekleri: SoruSecenegi[] = [];
    @Input() soruId!: number;

    value: number | null = null;
    isDisabled = false;

    onChangeFn = (value: any) => { };
    onTouchedFn = () => { };

    onRadioChange(id: number): void {
        this.value = id;
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
