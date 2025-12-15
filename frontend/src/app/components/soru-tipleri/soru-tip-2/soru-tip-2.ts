import { Component, Input, forwardRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

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
export class SoruTip2 implements ControlValueAccessor, OnInit, OnChanges {
    @Input() soruId!: number;
    @Input() soruSecenekleri: any[] = [];
    @Input() soruBasligi: string = '';
    @Input() soruIndex: number = 0;
    @Input() isImperative: boolean = false;

    scale: number[] = [];
    value: number | null = null;
    isDisabled = false;

    minLabel = 'En Düşük';
    maxLabel = 'En Yüksek';

    onChangeFn = (value: any) => { };
    onTouchedFn = () => { };

    ngOnInit(): void {
        this.updateScaleFromOptions();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['soruSecenekleri']) {
            this.updateScaleFromOptions();
        }
    }

    private updateScaleFromOptions(): void {
        if (this.soruSecenekleri && this.soruSecenekleri.length > 0) {
            const values = this.soruSecenekleri
                .map(s => parseInt(s.answer, 10))
                .filter(v => !isNaN(v))
                .sort((a, b) => a - b);

            if (values.length > 0) {
                this.scale = values;
                this.minLabel = `En Düşük (${values[0]})`;
                this.maxLabel = `En Yüksek (${values[values.length - 1]})`;
            }
        }
    }

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
