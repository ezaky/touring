import BaseComponent from "../whiz/components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import { msg } from '@lit/localize';
import "./HomePage.css";
import Router from "../whiz/app/Router";

export default class HomePage extends BaseComponent {
    render() {
        this.classList.add("gem-page");
        renderLit(html`
            ${this._renderHero()}
            ${this._renderOverview()}
            ${this._renderFooter()}
        `, this);
    }
    private _renderHero() {
        return html`
            <section class="hero-section">
                <div class="container">
                    <span class="hero-badge">${msg("For touring performers")}</span>
                    <h1 class="hero-headline">${msg("Tell fans when you’re coming to town.")}</h1>
                    <p class="hero-subheadline">
                        ${msg("Post your tour cities and dates in seconds. Fans pick their town and get an email the moment you're nearby.")}
                    </p>
                    <div class="hero-cta-group">
                        <wa-button appearance="accent" variant="brand" @click=${this._onNewPerformer}>${msg("Performer Sign Up")}</wa-button>
                    </div>
                    <p class="hero-reassurance">
                        ${msg("Free to use • No social algorithm")}
                    </p>
                </div>
            </section>
        `;
    }
    private _renderOverview() {
        return html`
            <section id="how-it-works" class="how-it-works-section">
                <div class="container">
                    <div class="section-header">
                        <h2 class="section-title">${msg("How It Works")}</h2>
                    </div>

                    <div class="steps-grid">
                        <article class="step-card">
                            <div class="step-number">1</div>
                            <h3 class="step-title">${msg("Add your stops")}</h3>
                            <p class="step-description">${msg("Add your stops — Enter the cities and date ranges you’re performing.")}</p>
                        </article>

                        <article class="step-card">
                            <div class="step-number">2</div>
                            <h3 class="step-title">${msg("Share one link")}</h3>
                            <p class="step-description">${msg("Put your tour link in your bio, newsletter, or stage banter.")}</p>
                        </article>

                        <article class="step-card">
                            <div class="step-number">3</div>
                            <h3 class="step-title">${msg("Fans get notified")}</h3>
                            <p class="step-description">${msg("Subscribers pick their town and receive an automatic email when you schedule a stop there.")}</p>
                        </article>
                    </div>
                </div>
            </section>
        `;
    }
    private _renderFooter() {
        return html`
            <footer class="site-footer">
                <div class="container footer-container">
                    <p class="footer-copyright">Pepits Touring &copy; ${new Date().getFullYear()}. ${msg("All rights reserved.")}</p>
                </div>
            </footer>
        `;
    }
    private _onNewPerformer = () => {
        Router.navigate({
            pageId: "touring.website.new_performer_page"
        });
    }
}
customElements.define("home-page", HomePage);