import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})

// Kullanıcıların sisteme giriş yapabilmesi için sicil ve şifrelerini girdikleri form sayfasıdır.

export class Login {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      sicil: ['', Validators.required],
      sifre: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    const { sicil, sifre } = this.loginForm.value;

    this.authService.login(sicil, sifre).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading = false;
        if (error.status === 401) {
          this.errorMessage = 'Sicil numarası veya şifre hatalı.';
        } else {
          this.errorMessage = 'Sunucuya bağlanırken bir hata oluştu.';
        }
        console.error(error);
      }
    });
  }
}
