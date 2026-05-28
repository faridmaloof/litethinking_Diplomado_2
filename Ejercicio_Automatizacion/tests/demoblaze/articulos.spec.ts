import { test, expect } from "@playwright/test";
import { MainPage } from "../../pages/main";

test("debe mostrar articulos", async ({ page }) => {
  const mainPage = await new MainPage(page).open();
  const overviewPage = await mainPage.hasItems();
  const pricesVisible = await mainPage.ContainPrices();
  const titlesVisible = await mainPage.ContainsTitle();
  const descriptionsVisible = await mainPage.ContainDescription();

  expect(overviewPage).toBeTruthy();
  expect(pricesVisible).toBeTruthy();
  expect(titlesVisible).toBeTruthy();
  expect(descriptionsVisible).toBeTruthy();
});
