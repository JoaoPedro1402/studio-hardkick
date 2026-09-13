import { test, expect } from '@playwright/test';

test('link inicial permite definir senha e remove o token da URL (Auth isolado)', async ({page}) => {
  const id='00000000-0000-4000-8000-000000000002';
  const user={id,email:'admin@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
  const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')}.test`;
  await page.route('**/auth/v1/verify', route=>route.fulfill({json:{access_token:jwt,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user}}));
  let changed=false;
  await page.route('**/auth/v1/user', route=>{
    if(route.request().method()==='PUT') changed=route.request().postDataJSON().password==='senha-exclusiva-de-teste';
    return route.fulfill({json:user});
  });
  await page.route('**/functions/v1/hardkick', route=>route.fulfill({json:{bookings:[],weekly:[],exceptions:[],settings:{price_cents:13500,pix_key:null,pix_key_type:null,pix_holder:null},audit:[],calendar:[]}}));
  await page.goto('/admin?definir-senha=1&token_hash=token-exclusivo-de-teste');
  await expect(page.getByRole('heading',{name:'Defina sua senha'})).toBeVisible();
  expect(page.url()).not.toContain('token_hash');
  await page.getByLabel('Nova senha',{exact:true}).fill('senha-exclusiva-de-teste');
  await page.getByLabel('Repita a nova senha',{exact:true}).fill('senha-exclusiva-de-teste');
  await page.getByRole('button',{name:'Definir senha',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Senha definida');
  expect(changed).toBe(true);
});
