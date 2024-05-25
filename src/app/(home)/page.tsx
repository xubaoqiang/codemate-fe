"use client";
import FilerTabsTree, { TreeItem, type FilerTabsTreeData } from "@/components/common/filter-tabs-tree";
import FixedSelect, { type FixedSelectOptions } from "@/components/common/fixed-select";
import LinkBtn from "@/components/common/link-btn";
import useUrl from "@/hooks/useUrl";
import { request } from "@/lib/request";
import { useAntdTable, useRequest } from "ahooks";
import { Switch, Table, TableColumnsType, Tag } from "antd";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { PROGRAMMING_LANGS } from "@/constants/misc";
import ProblemListMask from "@/components/home/problem-list-mask";
import store from "@/store/modal";
import CommonModal from "@/components/common/common-modal";
import { useRouter } from "next/navigation";

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
        {new Array(Number(record?.difficulty ?? 0))
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
        {new Array(Number(record?.difficulty ?? 0))
          .fill(0)
          ?.map((_, index) => <Image src="/img/fire.png" alt="" key={index} width={15} height={15}></Image>)}
      </div>
    ),
  },
];

const HomePage = () => {
  const router = useRouter();
  const { queryParams, updateQueryParams } = useUrl();
  const [selectedTreePath, setSelectedTreePath] = useState<string[]>([]);

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

  useEffect(() => {
    const tid = queryParams["tid"];
    if (!homeFilterData?.filterTree || !tid) return;
    const getInfoByKey = (key: string) => {
      let isLastNode = false;
      let currentSelectedKeysPath: string[] = [];

      const traverse = (node: TreeItem[], path: string[]) => {
        for (const item of node) {
          const newPath = [...path, item.key];
          if (item.key === key) {
            if (!item.children || item.children.length === 0) {
              isLastNode = true;
            }
            currentSelectedKeysPath = newPath;
            return;
          }
          if (item.children) {
            traverse(item.children, newPath);
          }
        }
      };

      traverse(homeFilterData.filterTree, []);
      return { isLastNode, currentSelectedKeysPath };
    };
    const info = getInfoByKey(tid);
    setSelectedTreePath(info.currentSelectedKeysPath);
  }, [homeFilterData?.filterTree]);

  const { data: tdocData } = useRequest(
    async () => {
      const tid = queryParams["tid"];
      if (!tid) return { ishasPermission: true };
      const { data } = await request.get(`/p-list/${tid}` as "/p-list/{tid}", {
        transformData: (data) => {
          return data;
        },
      });
      return { tid: tid, content: data.tdoc.content, ishasPermission: data.hasPermission };
    },
    {
      cacheKey: "/home/filter-data/hasPermission",
      refreshDeps: [queryParams["tid"]],
    }
  );

  const { run: runPdocData } = useRequest(
    async (pid, assign) => {
      const { data } = await request.post(
        // @ts-ignore
        `/p/${pid}` as "/p/{pid}",
        { operation: "check" },
        {
          transformData: (data) => {
            return data;
          },
        }
      );
      if (!data.hasPerm) {
        if (data.activation.includes("group")) {
          store.modalJumpTo("activate-question-group", {
            pid,
            group: assign,
          });
          store.isModalShow.set(true);
        } else if (data.activation.includes("point")) {
          store.modalJumpTo("activate-question-point", {
            pid,
            group: assign,
          });
          store.isModalShow.set(true);
        }
      } else {
        router.push(`/p/${pid}`);
      }
    },
    {
      cacheKey: "/home/filter-data/hasPerm",
      manual: true,
    }
  );

  return (
    <Suspense>
      <FixedSelect
        options={homeFilterData?.sideTabs ?? []}
        onSelect={(i) => updateQueryParams("lang", i)}
        defaultSelectedValue={queryParams["lang"]}
      />
      <FilerTabsTree
        data={homeFilterData?.filterTree ?? []}
        selectedPath={selectedTreePath}
        onChange={(treePath) => {
          setSelectedTreePath(treePath);
          updateQueryParams("tid", treePath[treePath.length - 1]);
        }}
      />
      <ProblemListMask
        tid={tdocData?.tid ?? ""}
        content={tdocData?.content ?? ""}
        ishasPermission={tdocData?.ishasPermission ?? true}
      >
        <CommonModal />
        <Table
          {...tableProps}
          columns={columns}
          rowKey="pid"
          onRow={(record) => ({
            onClick: () => {
              runPdocData(record.pid, record.assign);
            },
          })}
          rowClassName="cursor-pointer"
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
      </ProblemListMask>
    </Suspense>
  );
};

export default HomePage;
