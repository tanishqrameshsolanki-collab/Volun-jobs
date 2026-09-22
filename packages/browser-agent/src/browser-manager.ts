import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async launch(options: { headless?: boolean } = {}) {
    this.browser = await chromium.launch({
      headless: options.headless ?? true,
    });
    this.context = await this.browser.newContext({ serviceWorkers: 'block' });
    return this.context;
  }

  async newPage(): Promise<Page> {
    if (!this.context) await this.launch();
    return this.context!.newPage();
  }

  async close() {
    await this.context?.close();
    await this.browser?.close();
    this.context = null;
    this.browser = null;
  }
}
