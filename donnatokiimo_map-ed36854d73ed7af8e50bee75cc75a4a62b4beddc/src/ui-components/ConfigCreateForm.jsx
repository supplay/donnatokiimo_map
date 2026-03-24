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
import { createConfig } from "../graphql/mutations";
const client = generateClient();
export default function ConfigCreateForm(props) {
  const {
    clearOnSuccess = true,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    menuJson: "",
    scheduleJson: "",
    dummy: "",
  };
  const [menuJson, setMenuJson] = React.useState(initialValues.menuJson);
  const [scheduleJson, setScheduleJson] = React.useState(
    initialValues.scheduleJson
  );
  const [dummy, setDummy] = React.useState(initialValues.dummy);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    setMenuJson(initialValues.menuJson);
    setScheduleJson(initialValues.scheduleJson);
    setDummy(initialValues.dummy);
    setErrors({});
  };
  const validations = {
    menuJson: [],
    scheduleJson: [],
    dummy: [],
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
          menuJson,
          scheduleJson,
          dummy,
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
            query: createConfig.replaceAll("__typename", ""),
            variables: {
              input: {
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
          if (clearOnSuccess) {
            resetStateValues();
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "ConfigCreateForm")}
      {...rest}
    >
      <TextField
        label="Menu json"
        isRequired={false}
        isReadOnly={false}
        value={menuJson}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              menuJson: value,
              scheduleJson,
              dummy,
            };
            const result = onChange(modelFields);
            value = result?.menuJson ?? value;
          }
          if (errors.menuJson?.hasError) {
            runValidationTasks("menuJson", value);
          }
          setMenuJson(value);
        }}
        onBlur={() => runValidationTasks("menuJson", menuJson)}
        errorMessage={errors.menuJson?.errorMessage}
        hasError={errors.menuJson?.hasError}
        {...getOverrideProps(overrides, "menuJson")}
      ></TextField>
      <TextField
        label="Schedule json"
        isRequired={false}
        isReadOnly={false}
        value={scheduleJson}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              menuJson,
              scheduleJson: value,
              dummy,
            };
            const result = onChange(modelFields);
            value = result?.scheduleJson ?? value;
          }
          if (errors.scheduleJson?.hasError) {
            runValidationTasks("scheduleJson", value);
          }
          setScheduleJson(value);
        }}
        onBlur={() => runValidationTasks("scheduleJson", scheduleJson)}
        errorMessage={errors.scheduleJson?.errorMessage}
        hasError={errors.scheduleJson?.hasError}
        {...getOverrideProps(overrides, "scheduleJson")}
      ></TextField>
      <TextField
        label="Dummy"
        isRequired={false}
        isReadOnly={false}
        value={dummy}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              menuJson,
              scheduleJson,
              dummy: value,
            };
            const result = onChange(modelFields);
            value = result?.dummy ?? value;
          }
          if (errors.dummy?.hasError) {
            runValidationTasks("dummy", value);
          }
          setDummy(value);
        }}
        onBlur={() => runValidationTasks("dummy", dummy)}
        errorMessage={errors.dummy?.errorMessage}
        hasError={errors.dummy?.hasError}
        {...getOverrideProps(overrides, "dummy")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Clear"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          {...getOverrideProps(overrides, "ClearButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={Object.values(errors).some((e) => e?.hasError)}
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
