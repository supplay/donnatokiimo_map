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
export declare type UserSubscriptionUpdateFormInputValues = {
    userId?: string;
    subscription?: string;
    userLat?: number;
    userLng?: number;
};
export declare type UserSubscriptionUpdateFormValidationValues = {
    userId?: ValidationFunction<string>;
    subscription?: ValidationFunction<string>;
    userLat?: ValidationFunction<number>;
    userLng?: ValidationFunction<number>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type UserSubscriptionUpdateFormOverridesProps = {
    UserSubscriptionUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    userId?: PrimitiveOverrideProps<TextFieldProps>;
    subscription?: PrimitiveOverrideProps<TextFieldProps>;
    userLat?: PrimitiveOverrideProps<TextFieldProps>;
    userLng?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type UserSubscriptionUpdateFormProps = React.PropsWithChildren<{
    overrides?: UserSubscriptionUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    userSubscription?: any;
    onSubmit?: (fields: UserSubscriptionUpdateFormInputValues) => UserSubscriptionUpdateFormInputValues;
    onSuccess?: (fields: UserSubscriptionUpdateFormInputValues) => void;
    onError?: (fields: UserSubscriptionUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: UserSubscriptionUpdateFormInputValues) => UserSubscriptionUpdateFormInputValues;
    onValidate?: UserSubscriptionUpdateFormValidationValues;
} & React.CSSProperties>;
export default function UserSubscriptionUpdateForm(props: UserSubscriptionUpdateFormProps): React.ReactElement;
