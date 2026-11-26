import BaseComponent from "../whiz/components/BaseComponent";
import { html, render as renderLit } from "lit-html";
import { msg } from '@lit/localize';
import * as _ from "lodash-es";
import "./PerformerProfile.css";
import '@web.awesome.me/webawesome-pro/dist/components/icon/icon.js';
import '@web.awesome.me/webawesome-pro/dist/components/file-input/file-input.js';
import QueryCommand from "../whiz/entities/QueryCommand";
import { Entity, QueryType } from "shared/whiz/entities/QueryDefs";
import '@github/markdown-toolbar-element';

const PerformerEntityType = "touring.performer";

const ImageFiles = "image/png, image/webp, image/gif, image/jpeg";
const BioRows = 15;

export interface PerformerProfileProps {
    performerId
}

export default class PerformerProfile extends BaseComponent<PerformerProfileProps> { 
    private _imageUrl: string;

    async loadData() {
        let command = new QueryCommand({
            querySpec: {
                entityTypeId: PerformerEntityType,
                entityId: this.props.performerId,
                fields: ["$image_url"],
            }
        });
        this._imageUrl = (await command.execute()).data["$image_url"];
    }

    render() {  
        renderLit(html`
            <section class="gem-section">
                <div class="section-header">
                    <h2 class="section-title">${msg("Profile")}</h2>
                    <div class="section-subtitle">${msg("Shown on your public sign-up page.")}</div>
                </div>
                <div class="profile-content">
                    <div class="image-container">
                        ${this._imageUrl 
                            ? html`
                                <img @click=${this._handleEditImageCommand}/>
                                <div class="profile-image-actions">
                                    <wa-button variant="neutral" appearance="plain" @click=${this._handleEditImageCommand} class="btn-xs-plain">
                                        <wa-icon name="pen" variant="light" label="Edit"></wa-icon>
                                    </wa-button>
                                    <wa-button variant="neutral" appearance="plain" @click=${this._handleRemoveImage} class="btn-xs-plain">
                                        <wa-icon name="trash-can" variant="light" label="Delete"></wa-icon>
                                    </wa-button>
                                </div>
                            `
                            : html`
                                <wa-button class="add-image-btn" appearance="plain" variant="brand" @click=${this._handleEditImageCommand}>
                                    <wa-icon name="plus" variant="light"></wa-icon> ${msg("Add Image")}
                                </wa-button>
                            `}
                        <input type="file" accept="${ImageFiles}" hidden style="display: none"/>
                    </div>
                    <div class="bio-text-container">
                        <textarea id="performer-bio" placeholder="Your bio goes here..." rows="${BioRows}" class="bio-input"></textarea>
                    </div>
                </div>
            </section>
        `, this);
        if (this._imageUrl) {
            this.querySelector<any>(".image-container img").src = this._imageUrl;
        }
        this.querySelector("input[type=file]").addEventListener("change", this._onProfileImageChange);
    }
    
    private _handleEditImageCommand = (e) => {
        this.querySelector<any>("input[type=file]").click();
    }
    private _onProfileImageChange = async (e) => {
        const fileInput = e.target;
        const file = fileInput.files?.[0];
        if (!file) {
            return
        }
        console.log(`image size: ${file.size}`); // ezez
        const formData = new FormData();
        formData.append("profileImage", file); // name doesn't matter
        let command = new QueryCommand<QueryType.Update>({
            queryType: QueryType.Update,
            querySpec: {
                entityTypeId: PerformerEntityType,
                entityId: this.props.performerId,
                entity: {}
            },
            formData,
            monitorElem: this.querySelector(".image-container"),
            successMessage: null
        });
        await command.execute();
        this.refresh();
    }
    private _handleRemoveImage = async () => {
        let command = new QueryCommand<QueryType.Update>({
            queryType: QueryType.Update,
            querySpec: {
                entityTypeId: PerformerEntityType,
                entityId: this.props.performerId,
                entity: {image_bucket_file_name: null}
            },
            monitorElem: this.querySelector(".image-container"),
            confirmationMessage: msg("Are you sure you want to remove the profile image?"),
            successMessage: null
        });
        await command.execute();
        this.refresh();
    }
}
customElements.define("performer-profile", PerformerProfile);