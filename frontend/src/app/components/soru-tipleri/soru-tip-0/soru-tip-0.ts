import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { SoruSecenegi } from '../../../interfaces/anket-interface';

@Component({
    selector: 'app-soru-tip-0',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './soru-tip-0.html',
    styleUrls: ['./soru-tip-0.css'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SoruTip0),
            multi: true
        }
    ]
})
export class SoruTip0 implements ControlValueAccessor {
    @Input() soruSecenekleri: SoruSecenegi[] = [];
    @Input() soruBasligi: string = '';
    @Input() soruIndex: number = 0;
    @Input() isImperative: boolean = false;

    selectedIds: number[] = [];
    isDisabled = false;

    onChangeFn = (value: any) => { };
    onTouchedFn = () => { };

    isChecked(id: number): boolean {
        return this.selectedIds.includes(id);
    }

    onChange(event: Event, id: number): void {
        const isChecked = (event.target as HTMLInputElement).checked;
        if (isChecked) {
            this.selectedIds = [...this.selectedIds, id];
        } else {
            this.selectedIds = this.selectedIds.filter(x => x !== id);
        }
        this.onChangeFn(this.selectedIds);
        this.onTouchedFn();
    }

    writeValue(obj: any): void {
        if (obj) {
            this.selectedIds = obj;
        } else {
            this.selectedIds = [];
        }
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
