import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

// --- ADIÇÕES PARA DATAS ---
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

// --- 1. IMPORTE O provideNgxMask AQUI ---
import { provideNgxMask } from 'ngx-mask';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

// --- ADIÇÃO NECESSÁRIA AQUI ---
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { getStorage, provideStorage } from '@angular/fire/storage';

// --- 1. CRIE A CONSTANTE COM OS FORMATOS PT-BR ---
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

const firebaseConfig = {
  apiKey: "AIzaSyB3N56X8DcDkdpys5iRVn7QYn9bs7SVG30",
  authDomain: "lucas-bov.firebaseapp.com",
  projectId: "lucas-bov",
  storageBucket: "lucas-bov.firebasestorage.app",
  messagingSenderId: "838511603184",
  appId: "1:838511603184:web:54f0d3da98ed6df7624135"
};




export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    // --- SOLUÇÃO ADICIONADA AQUI ---
    provideFirestore(() => getFirestore()),
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    provideFunctions(() => getFunctions()),
    provideStorage(() => getStorage()),
    provideMomentDateAdapter(),
     { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }, // <-- 2. ADICIONE O PROVEDOR DE FORMATOS
    provideNgxMask(),
    importProvidersFrom(MatSnackBarModule)
  ]
};