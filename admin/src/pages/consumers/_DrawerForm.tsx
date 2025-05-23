/* eslint-disable */
import { useMutation } from "@tanstack/react-query";
import { Button, Drawer, Form, Input, Select } from "antd";
import { useEffect } from "react";
import { get, patch, post } from "../../api/crud-api";
import { endpoints } from "../../api/endpoints";
import { useMessageStore } from "../../stores/messageStore";

// @ts-ignore
export default function DrawerForm({
  model,
  onClose,
  open,
  onSubmitSuccess,
  isEditing,
  editedItem,
  planOptions,
  ...props
}) {
  const [form] = Form.useForm();
  const { messageApi } = useMessageStore();

  const checkSubdomain = async (value: string) => {
    const response = await get(`${endpoints.checkSubdomain}?value=${value}`);
    return response.available;
  };

  const createData = useMutation({
    mutationFn: async (data) => await post(endpoints.consumer, data),
    onSuccess: (response) => {
      messageApi?.success("Saved Successfully");
      form.resetFields();
      onSubmitSuccess();
    },
    onError: () => {
      messageApi?.error("Something went wrong");
    },
  });

  const updateData = useMutation({
    mutationFn: async (data: any) =>
      await patch(`${endpoints.consumer}/${data.id}`, data),
    onSuccess: (response) => {
      messageApi?.success("Updated Successfully");
      form.resetFields();
      onSubmitSuccess(true);
    },
    onError: () => {
      messageApi?.error("Something went wrong");
    },
  });

  const onFinish = async (formValues: any) => {
    const payload = {
      company_name: formValues.company_name,
      name: formValues.name,
      phone: formValues.phone,
      address: formValues.address,
      subdomain: formValues.subdomain,
      plan_id: formValues.plan_id, // dropdown or input
      email: formValues.email,
      password: formValues.password,
      secondary_email: formValues?.secondary_email
        ? formValues.secondary_email
        : null,
      business_category: formValues?.business_category
        ? formValues.business_category
        : null,
    };

    if (isEditing && editedItem) {
      return updateData.mutate({
        ...payload,
        id: editedItem.id,
      });
    }

    // @ts-ignore
    createData.mutate(payload);
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  useEffect(() => {
    if (isEditing && editedItem) {
      form.setFieldsValue({
        company_name: editedItem.company_name,
        name: editedItem.users?.find((user: any) => user.role?.name === "Admin")
          ?.name,
        email: editedItem.email,
        secondary_email: editedItem?.secondary_email,
        business_category: editedItem?.business_category,

        phone: editedItem.phone,
        address: editedItem.address,
        subdomain: editedItem.subdomain,
        plan_id: editedItem.plan_id,
      });
    } else {
      form.resetFields();
    }
  }, [isEditing, editedItem, form]);

  return (
    <>
      <Drawer
        title={isEditing ? "Update Consumer" : "Add Consumer"}
        onClose={onClose}
        width={600}
        open={open}
        style={{ maxHeight: "100vh", overflowY: "auto" }} // Adjusting drawer max height
      >
        <Form
          form={form}
          name="basic"
          labelCol={{ span: 8 }} // Adjust column width for better alignment
          wrapperCol={{ span: 16 }}
          labelAlign="right" // Right-align the labels
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="Company Name"
            name="company_name"
            rules={[{ required: true, message: "This field is required" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Business Category" name="business_category">
            <Input />
          </Form.Item>

          <Form.Item label="Phone" name="phone">
            <Input />
          </Form.Item>

          <Form.Item label="Address" name="address">
            <Input />
          </Form.Item>

          <Form.Item
            label="Subdomain"
            name="subdomain"
            rules={[
              { required: true, message: "This field is required" },
              {
                validator: async (_, value) => {
                  if (!value || editedItem?.subdomain === value)
                    return Promise.resolve(); // Skip validation if the field is empty
                  try {
                    const availabilty = await checkSubdomain(value);
                    if (!availabilty) {
                      return Promise.reject(
                        new Error("Subdomain is already taken")
                      );
                    }
                  } catch (error) {
                    return Promise.reject(
                      new Error("Failed to validate subdomain")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Plan"
            name="plan_id"
            rules={[{ required: true, message: "This field is required" }]}
          >
            <Select
              size="middle"
              allowClear
              // showSearch
              // optionFilterProp="label"
              // filterSort={(
              //   optionA: { label?: string },
              //   optionB: { label?: string }
              // ) =>
              //   (optionA?.label ?? "")
              //     .toLowerCase()
              //     .localeCompare((optionB?.label ?? "").toLowerCase())
              // }
              options={planOptions}
            />
          </Form.Item>

          <Form.Item
            label="Owner Name"
            name="name"
            rules={[{ required: true, message: "This field is required" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Primary Email"
            name="email"
            rules={[{ required: true, message: "This field is required" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Secondary Email" name="secondary_email">
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: !isEditing, message: "This field is required" },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateData.isPending || createData.isPending}
            >
              Save
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
