import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [
    RouterLink
  ],
  standalone: true,
  templateUrl: './not-found.html',
  styleUrl: './not-found.css'
})

// Kullanıcı var olmayan bir URL'ye gitmeye çalıştığında gösterilen "404 Sayfa Bulunamadı" hata sayfasıdır.

export class NotFound {

}
