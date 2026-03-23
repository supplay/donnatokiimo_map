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
export declare type UserPointUpdateFormInputValues = {
    points?: number;
    owner?: string;
};
export declare type UserPointUpdateFormValidationValues = {
    points?: ValidationFunction<number>;
    owner?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type UserPointUpdateFormOverridesProps = {
    UserPointUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    points?: PrimitiveOverrideProps<TextFieldProps>;
    owner?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type UserPointUpdateFormProps = React.PropsWithChildren<{
    overrides?: UserPointUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    userPoint?: any;
    onSubmit?: (fields: UserPointUpdateFormInputValues) => UserPointUpdateFormInputValues;
    onSuccess?: (fields: UserPointUpdateFormInputValues) => void;
    onError?: (fields: UserPointUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: UserPointUpdateFormInputValues) => UserPointUpdateFormInputValues;
    onValidate?: UserPointUpdateFormValidationValues;
} & React.CSSProperties>;
export default function UserPointUpdateForm(props: UserPointUpdateFormProps): React.ReactElement;
