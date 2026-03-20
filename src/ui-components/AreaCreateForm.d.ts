/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SwitchFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
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
export declare type AreaCreateFormInputValues = {
    name?: string;
    lat?: number;
    lng?: number;
    catchCopy?: string;
    isOpen?: boolean;
};
export declare type AreaCreateFormValidationValues = {
    name?: ValidationFunction<string>;
    lat?: ValidationFunction<number>;
    lng?: ValidationFunction<number>;
    catchCopy?: ValidationFunction<string>;
    isOpen?: ValidationFunction<boolean>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type AreaCreateFormOverridesProps = {
    AreaCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
    lat?: PrimitiveOverrideProps<TextFieldProps>;
    lng?: PrimitiveOverrideProps<TextFieldProps>;
    catchCopy?: PrimitiveOverrideProps<TextFieldProps>;
    isOpen?: PrimitiveOverrideProps<SwitchFieldProps>;
} & EscapeHatchProps;
export declare type AreaCreateFormProps = React.PropsWithChildren<{
    overrides?: AreaCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: AreaCreateFormInputValues) => AreaCreateFormInputValues;
    onSuccess?: (fields: AreaCreateFormInputValues) => void;
    onError?: (fields: AreaCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: AreaCreateFormInputValues) => AreaCreateFormInputValues;
    onValidate?: AreaCreateFormValidationValues;
} & React.CSSProperties>;
export default function AreaCreateForm(props: AreaCreateFormProps): React.ReactElement;
