import { test, expect } from "@playwright/test";
test("persistent dock, Apollo world, scope and back navigation", async ({page}, info) => {
 const errors: string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto("/");
 const dock=page.getByRole("navigation",{name:"Quick navigation"});
 await expect(dock.getByRole("button")).toHaveCount(5);
 await dock.getByRole("button",{name:"Faith",exact:true}).click();
 await expect(page).toHaveURL(/#faith$/);
 await dock.getByRole("button",{name:"Open Apollo"}).click();
 const world=page.getByRole("dialog",{name:"Apollo",exact:true});
 await expect(world).toBeVisible();
 await expect(world.getByText("Think clearly. Move forward.")).toBeVisible();
 await expect(world.locator("canvas")).toHaveAttribute("data-ready","true");
 await page.screenshot({path:`artifacts/apollo-${info.project.name}.png`});
 await world.getByRole("button",{name:"Plan my day",exact:true}).click();
 await expect(page.getByLabel("Your starting point")).toHaveValue(/three meaningful priorities/);
 await page.getByRole("button",{name:"Juntos context",exact:true}).click();
 await expect(page.getByLabel("Your starting point")).toHaveValue("");
 await expect(page.getByText("Juntos · shared sources",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Voice · soon",exact:true}).click();
 await expect(page.getByText("Voice is planned.",{exact:false})).toBeVisible();
 await page.goBack(); await expect(world).toHaveCount(0);await expect(page).toHaveURL(/#faith$/);
 await page.goForward();await expect(world).toBeVisible();
 await world.getByRole("button",{name:"Home",exact:true}).click();await expect(world).toHaveCount(0);
 expect(errors).toEqual([]);
});
test("reduced motion and unavailable WebGL retain a usable conversation", async ({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.addInitScript(()=>{
  const getContext=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this: HTMLCanvasElement, type: string,...args: unknown[]) {
   if(type==="webgl" || type==="webgl2") return null;
   return Reflect.apply(getContext,this,[type,...args]);
  } as typeof getContext;
 });
 await page.goto("/#apollo");
 const world=page.getByRole("dialog",{name:"Apollo",exact:true});await expect(world).toBeVisible();
 await expect(world.locator(".orb-fallback")).toBeVisible();
 await page.getByLabel("Your starting point").fill("A quiet moment");
 await expect(page.getByLabel("Your starting point")).toHaveValue("A quiet moment");
 await page.keyboard.press("Escape");await expect(world).toHaveCount(0);
});
