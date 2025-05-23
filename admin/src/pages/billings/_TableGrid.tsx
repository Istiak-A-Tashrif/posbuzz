/* eslint-disable */

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Popconfirm, Space, Table } from "antd";
import { useEffect } from "react";
import { deleteApi } from "../../api/crud-api";
import { getUrlForModel } from "../../api/endpoints";
import { useMessageStore } from "../../stores/messageStore";
import dayjs from "dayjs";

// @ts-ignore
export default function _TableGrid({
  model,
  trigger,
  onClickEdit,
  isLoading,
  isError,
  fetchData,
  refetch,
  ...props
}) {
 const { messageApi } = useMessageStore();

  useEffect(() => {
    if (trigger) {
      refetch();
    }
  }, [trigger]);

  const deleteMutation = useMutation({
    mutationFn: async (id: any) => await deleteApi(getUrlForModel(model, id)),
    onSuccess: () => {
      messageApi?.success("Deleted Successfully");
      refetch();
    },
    onError: () => {
      messageApi?.error("Something went wrong");
    },
  });

  const handleDeleteClient = (id: any) => {
    deleteMutation.mutate(id);
  };

  const columns = [
    {
      title: "Name",
      dataIndex: ["consumer", "company_name"],
      key: "name",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
    },
    {
      title: "Billing date",
      dataIndex: "billing_date",
      render: (billing_date) => dayjs(billing_date).format("DD-MM-YYYY"),
      key: "billing_date",
    },
    {
      title: "Reference",
      dataIndex: "reference",
      key: "reference",
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: any) => (
        <Space>
          <Button onClick={() => onClickEdit(record)} type={"link"}>
            <EditOutlined />
          </Button>
          <Popconfirm
            title="Delete this item?"
            description="This action cannot be undone"
            onConfirm={() => handleDeleteClient(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger type={"link"}>
              <DeleteOutlined />
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isError) {
    return <p>Failed to load data</p>;
  }

  return (
    <>
      <Table
        rowKey="id"
        scroll={{
          x: true,
        }}
        loading={isLoading}
        columns={columns}
        dataSource={fetchData}
      />
    </>
  );
}
