import ConfirmationDialog, { MessageType } from "../components/ConfirmationDialog";
import { DialogProps } from "../components/DialogDefs";
import CommandMonitor from "./CommandMonitor";
import * as _ from "lodash-es";

export interface CommandProps {
    confirmationMessage?: MessageType,
    successMessage?: string,
    component?: HTMLElement,
    monitorElem?: HTMLElement,
    hasProgress?: boolean,
    progressLabel?: string,
    renderDialog?: (props: DialogProps) => void,
    errorHandler?: (error) => boolean
}

export default abstract class BaseCommand<T extends CommandProps = CommandProps> {
    protected props:T;

    protected abstract customExecute(): Promise<any>;

    constructor(props: T) {
        this.props = {...props};
        _.defaults(this.props, {
            hasProgress: true
        });
    }
    async execute(): Promise<any> {
        let props = this.props;
        let confirmationMessage = props.confirmationMessage;
        if (confirmationMessage) {
            await ConfirmationDialog.open({
                message: confirmationMessage
            })
        }
        let promise = this.customExecute();
        new CommandMonitor({
            promise: promise,
            successMessage: props.successMessage,
            elem: props.monitorElem,
            hasProgress: props.hasProgress,
            progressLabel: props.progressLabel,
            errorHandler: props.errorHandler
        });
        return promise;
    }
}