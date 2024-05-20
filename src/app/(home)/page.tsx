"use client";
import FilerTabsTree, { TreeItem, type FilerTabsTreeData } from "@/components/common/filter-tabs-tree";
import FixedSelect, { type FixedSelectOptions } from "@/components/common/fixed-select";
import LinkBtn from "@/components/common/link-btn";
import useUrl from "@/hooks/useUrl";
import { request } from "@/lib/request";
import { useAntdTable, useRequest } from "ahooks";
import { Switch, Table, TableColumnsType, Tag } from "antd";
import Image from "next/image";
import { Suspense } from "react";
import { PROGRAMMING_LANGS } from "@/constants/misc";
import BulltinBoard from "@/components/common/bulletin-board/index";
interface DataType {
  key: string;
  pid: number;
  title: string;
  titleDescription: string;
  difficulty: number;
  nSubmit: number;
  nAccept: number;
  tag: string[];
}

const columns: TableColumnsType<DataType> = [
  {
    title: "编号",
    dataIndex: "pid",
    key: "pid",
    width: "10%",
  },
  {
    title: "题目名称",
    dataIndex: "title",
    key: "title",
    width: "18%",
    render: (_, { title }) => <span className="font-bold text-sm">{title}</span>,
  },
  {
    title: () => (
      <>
        <span className="font-bold text-sm mr-3">算法标签</span>
        <Switch defaultChecked />
      </>
    ),
    key: "tag",
    dataIndex: "tag",
    width: "40%",
    render: (_, { tag }) => (
      <>
        {tag?.map((tag) => {
          return (
            <Tag color={"volcano"} key={tag} className="!text-primary !bg-orange-50 !leading-4">
              {tag.toUpperCase()}
            </Tag>
          );
        })}
      </>
    ),
  },
  {
    title: "难度",
    key: "difficulty",
    dataIndex: "difficulty",
    width: "12%",
    render: (_, record) => (
      <div className="flex gap-1">
        {new Array(Number(record?.difficulty))
          .fill(0)
          ?.map((_, index) => <Image src="/svg/star.svg" alt="" key={index} width={15} height={15}></Image>)}
      </div>
    ),
  },
  {
    title: "尝试",
    key: "nSubmit",
    dataIndex: "nSubmit",
    width: "5%",
  },
  {
    title: "AC率",
    key: "nAccept",
    dataIndex: "nAccept",
    width: "5%",
  },
  {
    title: "热度",
    key: "difficulty",
    dataIndex: "difficulty",
    width: "15%",
    render: (_, record) => (
      <div className="flex gap-1">
        {new Array(Number(record?.difficulty))
          .fill(0)
          ?.map((_, index) => <Image src="/img/fire.png" alt="" key={index} width={15} height={15}></Image>)}
      </div>
    ),
  },
];

const HomePage = () => {
  const { queryParams, updateQueryParams } = useUrl();

  const { data: homeFilterData } = useRequest(
    async () => {
      const { data } = await request.get("/p-list", {
        transformData: (data) => {
          console.log(data);
          return data;
        },
      });
      const parsePlistItem = (item: any) => {
        const _ret: TreeItem = {
          key: item.docId,
          label: item.title,
          children: [],
        };
        if (item.children?.length) {
          _ret.children = item.children.map(parsePlistItem);
        }
        return _ret;
      };
      const permittedLangs = Array.from(
        new Set(data.UiContext?.domain?.langs?.split(",").map((langId: string) => PROGRAMMING_LANGS[langId]))
      ).map((langName: any) => {
        return {
          label: langName,
          value: Object.keys(PROGRAMMING_LANGS).find((key) => PROGRAMMING_LANGS[key] === langName),
        } as FixedSelectOptions;
      });
      return {
        filterTree: [{ label: "全部", key: "" }, ...data.roots?.map(parsePlistItem)] as FilerTabsTreeData,
        sideTabs: [{ label: "全部", value: "" }, ...permittedLangs],
      };
    },
    {
      cacheKey: "/home/filter-data",
    }
  );

  const {
    data: tableData,
    tableProps: { pagination, ...tableProps },
  } = useAntdTable(
    async ({ current, pageSize }) => {
      const { data } = await request.get("/p", {
        params: {
          page: current,
          limit: pageSize,
          source: queryParams["tid"],
          lang: queryParams["lang"],
        },
      });
      updateQueryParams("page", String(current));
      return { total: data.pcount, list: data.pdocs as any[] };
    },
    {
      cacheKey: "/home/p/table-data",
      defaultCurrent: Number(queryParams["page"]) || 1,
      defaultPageSize: 15,
      refreshDeps: [queryParams["tid"], queryParams["lang"]],
    }
  );

  const result = useRequest(async () => {
    const res = await request.get("/bulletin/list", {});
  });

  const bulletinCardData = [
    {
      key: "12412",
      label: "赛事资讯",
      children: [
        {
          text: "可以折叠/展开的内容区域，用于对复杂区域进行分组和隐藏，保持页面的整洁2。",
          date: "2023-1-10",
          time: "20:09",
          href: "",
        },
        {
          text: "可以折叠/展开的内容区域，用于对复杂区域进行分组和隐藏，保持页面的整洁4。",
          date: "2023-1-10",
          time: "20:09",
          href: "",
        },
      ],
    },
    {
      key: "1241223",
      label: "赛事资讯2",
      children: [
        {
          text: "可以折叠/展开的内容区域，用于对复杂区域进行分组和隐藏，保持页面的整洁2。",
          date: "2023-1-10",
          time: "20:09",
          href: "",
        },
        {
          text: "可以折叠/展开的内容区域，用于对复杂区域进行分组和隐藏，保持页面的整洁4。",
          date: "2023-1-10",
          time: "20:09",
          href: "",
        },
      ],
    },
  ];

  return (
    <Suspense>
      <div className="w-full flex">
        <div className=" 4xl:max-w-7xl xl:max-w-[949px]">
          <FixedSelect
            options={homeFilterData?.sideTabs ?? []}
            onSelect={(i) => updateQueryParams("lang", i)}
            defaultSelectedValue={queryParams["lang"]}
          />
          <FilerTabsTree
            filerTabsTreeData={homeFilterData?.filterTree ?? []}
            onChange={(key) => {
              updateQueryParams("tid", key);
            }}
            defaultActiveKey={queryParams["tid"]}
          />
          <Table
            {...tableProps}
            columns={columns}
            rowKey="pid"
            expandable={{
              expandedRowRender: (record) => (
                <div
                  style={{
                    color: "#797979",
                    paddingBottom: "1rem",
                    borderBottom: "0.1rem dashed #F1F1F1",
                  }}
                >
                  {record?.titleDescription}
                </div>
              ),
              expandedRowClassName: () => "!text-grey",
              expandedRowKeys: tableData?.list?.map((item) => item.key),
              expandIcon: () => <></>,
            }}
            pagination={{
              ...pagination,
              position: ["bottomCenter"],
              showSizeChanger: false,
              itemRender(_, type, element) {
                if (type === "prev") {
                  return (
                    <>
                      <LinkBtn>首页</LinkBtn>
                      <LinkBtn>上一页</LinkBtn>
                    </>
                  );
                }
                if (type === "next") {
                  return (
                    <>
                      <LinkBtn>下一页</LinkBtn>
                      <LinkBtn>末页</LinkBtn>
                    </>
                  );
                }
                return element;
              },
            }}
          />
        </div>
        <div className="md:w-[0px] lg:w-[400px] overflow-hidden ml-[14px]">
          <BulltinBoard data={bulletinCardData}></BulltinBoard>
        </div>
      </div>
    </Suspense>
  );
};

export default HomePage;
