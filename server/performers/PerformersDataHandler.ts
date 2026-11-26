import { PersistQuery } from "../whiz/entities/Query";
import * as _ from "lodash-es";
import EntitiesDataHandler from "../whiz/entities/EntitiesDataHandler";
import { ControllerContext } from "../whiz/controllers/ControllerDefs";
import { Operator } from "shared/whiz/entities/Operator";
import FileUtil from "../whiz/util/FileUtil";
import CloudProviders from "../cloud/CloudProviders";
import { FindQuery } from "../whiz/entities/FindQuery";
import { FindQueryResult, UpdateQueryResult } from "shared/whiz/entities/QueryDefs";
import StringUtil from "shared/whiz/util/StringUtil";
import { GcpConfig } from "../gcp/GcpDefs";
import { FileDescriptor } from "../cloud/CloudDefs";

const PerformerEntityType = "touring.performer";
const GcpImageUrl = `https://storage.googleapis.com/${GcpConfig.bucketName}/{0}`;

export default class PerformersDataHandler extends EntitiesDataHandler {
    async preFind(query: FindQuery) {
        if (query.hasField("$image_url")) {
            query.addSelectField({field: "image_bucket_file_name"});
        }
    }
    async postFind(result: FindQueryResult, query: FindQuery) {
        if (!query.hasField("$image_url")) {
            return;
        }
        const performer = result.data[0];
        const fileName = performer.image_bucket_file_name;
        if (fileName) {
            performer["$image_url"] = StringUtil.substitute(GcpImageUrl, fileName);
        }
    }
    async preCreate(query: PersistQuery) {
        const entity = query.getEntity();
        entity["slug"] = await this._ensureUniqueSlug(this._getSlugForName(entity.name), query.getContext());
    }
    async preUpdate(query: PersistQuery) {
        const context: ControllerContext = query.getContext();
        let files = (<any>query.getContext().req).files;
        const entity = query.getEntity();
        if (!_.isEmpty(files)) {
            entity.image_bucket_file_name = await this._uploadImageFile(files, context);
            await this._deleteImageFile(query.getEntityId(), context);
            return;
        }
        if (entity.image_bucket_file_name === null) {
            await this._deleteImageFile(query.getEntityId(), context);
        }
    }
    private async _uploadImageFile(files: FileDescriptor[], context: ControllerContext) {
        if (files.length > 1) {
            throw new Error("Expected only 1 file");
        }
        const {bucketFilename} = await CloudProviders.getStorageProvider().uploadFile(files[0], context);
        FileUtil.deleteUploadedFiles(files);
        return bucketFilename;
    }
    private async _deleteImageFile(entityId, context: ControllerContext) {
        const entity = (await context.db.findOne({
            entityTypeId: PerformerEntityType,
            fields: ["image_bucket_file_name"],
            criteria: {id: entityId}
         }, context)).data;
         if (entity?.image_bucket_file_name) {
            await CloudProviders.getStorageProvider().deleteFile(entity.image_bucket_file_name);
         }
    }
    private async _ensureUniqueSlug(slug, context: ControllerContext) {
        const {data} = await context.db.find({
            entityTypeId: PerformerEntityType,
            fields: ["slug"],
            criteria: {slug: {[Operator.Like]: `${slug}*`}}
        }, context);
        const existingSlugs = new Set(_.map(data, "slug"));
        if (!existingSlugs.has(slug)) {
            return slug;
        }
        let counter = 2;
        while (existingSlugs.has(`${slug}-${counter}`)) {
            counter++;
        }
        return `${slug}-${counter}`;
    }
    private _getSlugForName(name: string): string {
        return name
            .normalize("NFKD")                   // Split accented characters into base + diacritic
            .replace(/[\u0300-\u036f]/g, "")     // Remove diacritical marks (é -> e, ç -> c)
            .toLowerCase()
            .replace(/&/g, " and ")              // Preserve "&" cleanly as "and"
            .replace(/[^a-z0-9]+/g, "-")         // Replace any non-alphanumeric sequence with "-"
            .replace(/^-+|-+$/g, "");            // Trim leading and trailing hyphens
    }
}