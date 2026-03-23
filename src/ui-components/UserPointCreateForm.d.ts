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
export declare type UserPointCreateFormInputValues = {
    points?: number;
    owner?: string;
};
export declare type UserPointCreateFormValidationValues = {
    points?: ValidationFunction<number>;
    owner?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type UserPointCreateFormOverridesProps = {
    UserPointCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    points?: PrimitiveOverrideProps<TextFieldProps>;
    owner?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type UserPointCreateFormProps = React.PropsWithChildren<{
    overrides?: UserPointCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: UserPointCreateFormInputValues) => UserPointCreateFormInputValues;
    onSuccess?: (fields: UserPointCreateFormInputValues) => void;
    onError?: (fields: UserPointCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: UserPointCreateFormInputValues) => UserPointCreateFormInputValues;
    onValidate?: UserPointCreateFormValidationValues;
} & React.CSSProperties>;
export default function UserPointCreateForm(props: UserPointCreateFormProps): React.ReactElement;
