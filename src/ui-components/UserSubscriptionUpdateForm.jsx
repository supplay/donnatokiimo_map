/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import { Button, Flex, Grid, TextField } from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { getUserSubscription } from "../graphql/queries";
import { updateUserSubscription } from "../graphql/mutations";
const client = generateClient();
export default function UserSubscriptionUpdateForm(props) {
  const {
    id: idProp,
    userSubscription: userSubscriptionModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    userId: "",
    subscription: "",
    userLat: "",
    userLng: "",
  };
  const [userId, setUserId] = React.useState(initialValues.userId);
  const [subscription, setSubscription] = React.useState(
    initialValues.subscription
  );
  const [userLat, setUserLat] = React.useState(initialValues.userLat);
  const [userLng, setUserLng] = React.useState(initialValues.userLng);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = userSubscriptionRecord
      ? { ...initialValues, ...userSubscriptionRecord }
      : initialValues;
    setUserId(cleanValues.userId);
    setSubscription(cleanValues.subscription);
    setUserLat(cleanValues.userLat);
    setUserLng(cleanValues.userLng);
    setErrors({});
  };
  const [userSubscriptionRecord, setUserSubscriptionRecord] = React.useState(
    userSubscriptionModelProp
  );
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await client.graphql({
              query: getUserSubscription.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getUserSubscription
        : userSubscriptionModelProp;
      setUserSubscriptionRecord(record);
    };
    queryData();
  }, [idProp, userSubscriptionModelProp]);
  React.useEffect(resetStateValues, [userSubscriptionRecord]);
  const validations = {
    userId: [{ type: "Required" }],
    subscription: [{ type: "Required" }],
    userLat: [],
    userLng: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          userId,
          subscription,
          userLat: userLat ?? null,
          userLng: userLng ?? null,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await client.graphql({
            query: updateUserSubscription.replaceAll("__typename", ""),
            variables: {
              input: {
                id: userSubscriptionRecord.id,
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "UserSubscriptionUpdateForm")}
      {...rest}
    >
      <TextField
        label="User id"
        isRequired={true}
        isReadOnly={false}
        value={userId}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              userId: value,
              subscription,
              userLat,
              userLng,
            };
            const result = onChange(modelFields);
            value = result?.userId ?? value;
          }
          if (errors.userId?.hasError) {
            runValidationTasks("userId", value);
          }
          setUserId(value);
        }}
        onBlur={() => runValidationTasks("userId", userId)}
        errorMessage={errors.userId?.errorMessage}
        hasError={errors.userId?.hasError}
        {...getOverrideProps(overrides, "userId")}
      ></TextField>
      <TextField
        label="Subscription"
        isRequired={true}
        isReadOnly={false}
        value={subscription}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              userId,
              subscription: value,
              userLat,
              userLng,
            };
            const result = onChange(modelFields);
            value = result?.subscription ?? value;
          }
          if (errors.subscription?.hasError) {
            runValidationTasks("subscription", value);
          }
          setSubscription(value);
        }}
        onBlur={() => runValidationTasks("subscription", subscription)}
        errorMessage={errors.subscription?.errorMessage}
        hasError={errors.subscription?.hasError}
        {...getOverrideProps(overrides, "subscription")}
      ></TextField>
      <TextField
        label="User lat"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={userLat}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              userId,
              subscription,
              userLat: value,
              userLng,
            };
            const result = onChange(modelFields);
            value = result?.userLat ?? value;
          }
          if (errors.userLat?.hasError) {
            runValidationTasks("userLat", value);
          }
          setUserLat(value);
        }}
        onBlur={() => runValidationTasks("userLat", userLat)}
        errorMessage={errors.userLat?.errorMessage}
        hasError={errors.userLat?.hasError}
        {...getOverrideProps(overrides, "userLat")}
      ></TextField>
      <TextField
        label="User lng"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={userLng}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              userId,
              subscription,
              userLat,
              userLng: value,
            };
            const result = onChange(modelFields);
            value = result?.userLng ?? value;
          }
          if (errors.userLng?.hasError) {
            runValidationTasks("userLng", value);
          }
          setUserLng(value);
        }}
        onBlur={() => runValidationTasks("userLng", userLng)}
        errorMessage={errors.userLng?.errorMessage}
        hasError={errors.userLng?.hasError}
        {...getOverrideProps(overrides, "userLng")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || userSubscriptionModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || userSubscriptionModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
