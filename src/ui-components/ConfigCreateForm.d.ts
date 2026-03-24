/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type ConfigCreateFormInputValues = {
    menuJson?: string;
    scheduleJson?: string;
    dummy?: string;
};
export declare type ConfigCreateFormValidationValues = {
    menuJson?: ValidationFunction<string>;
    scheduleJson?: ValidationFunction<string>;
    dummy?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ConfigCreateFormOverridesProps = {
    ConfigCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    menuJson?: PrimitiveOverrideProps<TextFieldProps>;
    scheduleJson?: PrimitiveOverrideProps<TextFieldProps>;
    dummy?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type ConfigCreateFormProps = React.PropsWithChildren<{
    overrides?: ConfigCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: ConfigCreateFormInputValues) => ConfigCreateFormInputValues;
    onSuccess?: (fields: ConfigCreateFormInputValues) => void;
    onError?: (fields: ConfigCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ConfigCreateFormInputValues) => ConfigCreateFormInputValues;
    onValidate?: ConfigCreateFormValidationValues;
} & React.CSSProperties>;
export default function ConfigCreateForm(props: ConfigCreateFormProps): React.ReactElement;
