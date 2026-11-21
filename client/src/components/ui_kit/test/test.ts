import {ui} from '../glass/src/glass'

// 1. Teste padrão (sem passar opções -> usa dark, medium, primary)
console.log('--- 1. Padrão ---');
console.log(ui.glass());

// 2. Teste Dark Mode com cor de destaque (blue) e borda extra grande
console.log('\n--- 2. Dark + Blue + Extralarge ---');
console.log(
  ui.glass({
    scheme: 'dark',
    radius: 'extralarge',
    blur: 'large',
    tintColor: 'blue',
    progressive: false,
  })
);

// 3. Teste Light Mode com Blur Progressivo (para header/navbar)
console.log('\n--- 3. Light + Progressive Blur ---');
console.log(
  ui.glass({
    scheme: 'light',
    radius: 'small',
    blur: 'medium',
    tintColor: 'secondary',
    progressive: true,
  })
);

// 4. Teste de acesso direto aos tokens
console.log('\n--- 4. Acesso direto aos tokens ---');
console.log('Cor Apple Red (Dark):', ui.glass({ scheme: 'dark', tintColor: 'red' }).backgroundColor);
console.log('Radius Large:', ui.glass({ radius: 'large' }).borderRadius);
