import { expect, Locator, Page } from "@playwright/test";
import { capture } from "../utils/evidence";

const URL = "https://www.demoblaze.com";

/**
 * POM clasico: localizadores y acciones viven juntos.
 */
export class MainPage {
  private readonly items: Locator;
  private readonly titles: Locator;
  private readonly prices: Locator;
  private readonly descriptions: Locator;

  constructor(private readonly page: Page) {
    // demoblaze no asocia labels accesibles a estos campos, por eso aqui CSS sigue siendo la opcion clara.
    this.items = page.locator(".card");
    this.titles = this.items.getByRole("heading", { level: 4 });
    this.prices = this.items.getByRole("heading", { level: 5 });
    this.descriptions = this.items.locator(".card-text");
  }

  async open(): Promise<MainPage> {
    await this.page.goto(URL);
    await capture(this.page, "demoblaze-open-login");
    return this;
  }

  async hasItems(): Promise<boolean> {
    await expect(this.items.first()).toBeVisible();
    return (await this.items.count()) > 0;
  }

  private async validateAllItems(locator: Locator): Promise<boolean> {
    const totalItems = await locator.count();

    for (let index = 0; index < totalItems; index++) {
      await expect(locator.nth(index)).toBeVisible();
    }

    return totalItems > 0;
  }

  async ContainPrices(): Promise<boolean> {
    return this.validateAllItems(this.prices);
  }

  async ContainsTitle(): Promise<boolean> {
    return this.validateAllItems(this.titles);
  }

  async ContainDescription(): Promise<boolean> {
    return this.validateAllItems(this.descriptions);
  }
}
