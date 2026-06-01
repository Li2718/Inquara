import type { AppLocale } from "../locale";

export const messages = {
  en: {
    common: {
      account: "Account",
      active: "active",
      backToCanvas: "Back to canvas",
      brand: "Inquara",
      cancel: "Cancel",
      copied: "Copied",
      delete: "Delete",
      deleting: "Deleting",
      edit: "Edit",
      loading: "Loading",
      more: "More",
      optional: "Optional",
      save: "Save",
      unknown: "Unknown"
    },
    language: {
      ariaLabel: "Language",
      menuLabel: "Language menu"
    },
    auth: {
      authMode: "Auth mode",
      createAccount: "Create account",
      email: "Email",
      invitationCode: "Invitation code",
      invitationMore: "More",
      loginAction: "Log in",
      loginFailed: "Login failed.",
      loginPanel: "Login",
      password: "Password",
      registerAction: "Register",
      rememberDevice: "Remember this device",
      submitWorking: "Working...",
      subtitle: "Sign in to open your personal canvases and grow branches from any answer.",
      title: "Start from one question."
    },
    appTopBar: {
      accountAria: "Account: {user}",
      accountMenu: "Account menu",
      admin: "Admin",
      alpha: "Alpha",
      backToCanvas: "Back to canvas",
      logOut: "Log out",
      logOutConfirm: "Log out?",
      logOutDescription: "You will need to sign in again on this device.",
      loggingOut: "Logging out...",
      openingCanvas: "Opening canvas...",
      resetCanvasView: "Reset canvas view",
      resetView: "Reset view"
    },
    workspaceList: {
      openingCanvas: "Opening canvas",
      researchCanvas: "Research canvas"
    },
    workspaceSidebar: {
      canvasActions: "Canvas actions for {title}",
      canvasList: "Canvas list",
      canvases: "Canvases",
      collapseSidebar: "Collapse sidebar",
      couldNotCreate: "Could not create canvas.",
      couldNotDelete: "Could not delete canvas.",
      couldNotLoad: "Could not load workspaces.",
      couldNotRename: "Could not rename canvas.",
      deleteCanvas: "Delete canvas?",
      deleteDescription: "{title} will be removed from your canvas list. This uses a soft delete.",
      loadingCanvases: "Loading canvases",
      newCanvas: "New canvas",
      noCanvases: "No canvases yet.",
      openSidebar: "Open sidebar",
      rename: "Rename",
      save: "Save",
      untitledCanvas: "Untitled canvas",
      workspaceNavigation: "Workspace navigation"
    },
    canvas: {
      actions: "Canvas actions",
      currentZoom: "Current zoom {percent}%",
      loadingCanvas: "Loading canvas",
      newChat: "New chat",
      organize: "Organize",
      organizeAria: "Organize chats into a compact hierarchy",
      preparingCanvas: "Preparing canvas view",
      resetView: "Reset view",
      resetViewAria: "Reset view to root chat",
      stage: "Canvas",
      workspace: "Canvas workspace",
      zoomControls: "Canvas zoom controls"
    },
    node: {
      actions: "Node actions",
      delete: "Delete",
      hideBranch: "Hide branch",
      moreActions: "More actions",
      moveToTrash: "Move chat to trash?",
      moveToTrashConfirm: "Move to trash",
      moveToTrashDescription: "This will hide this chat and its branches until you restore them from Trash.",
      rename: "Rename",
      resize: "Resize",
      resizeChat: "Resize chat"
    },
    chat: {
      askPlaceholder: "Ask in this node",
      send: "Send"
    },
    lease: {
      blockedEyebrow: "Workspace blocked",
      blockedTitle: "This workspace is active in another client",
      defaultMessage: "The content shown here may be out of date. Editing stays disabled until this client reconnects and becomes active again.",
      recoveringEyebrow: "Recovering workspace",
      recoveringTitle: "Waiting to restore editing",
      takeOver: "Take over here"
    },
    error: {
      backToCanvas: "Back to canvas",
      defaultHeading: "This view lost its thread.",
      defaultMessage: "Something interrupted the page while it was loading. Try again, or return to the canvas.",
      globalHeading: "The workspace hit a snag.",
      globalMessage: "The page could not finish loading. Try again, or return to the canvas from a fresh tab.",
      holdOn: "Hold on",
      tryAgain: "Try again"
    },
    notFound: {
      action: "Back to canvas",
      message: "This page is unavailable or you do not have access to it.",
      title: "Page not found"
    },
    adminCodes: {
      active: "active",
      admin: "Admin",
      by: "By: {email}",
      copyCode: "Copy code",
      copyInvitationCode: "Copy invitation code {code}",
      deleteCode: "Delete code",
      deleteCodeAria: "Delete invitation code {code}",
      deleteConfirm: "Delete invitation code?",
      deleteDescription: "{code} will be permanently deleted. This is only allowed for unused codes.",
      disable: "Disable",
      enable: "Enable",
      exactExpiry: "Or exact expiry",
      editNoteFor: "Edit note for {code}",
      expires: "Expires {date}",
      failedCopy: "Failed to copy code.",
      failedCreate: "Failed to create code.",
      failedDelete: "Failed to delete code.",
      failedDisable: "Failed to disable code.",
      failedEnable: "Failed to enable code.",
      failedLoad: "Failed to load admin codes.",
      failedNote: "Failed to update note.",
      failedSetting: "Failed to update registration setting.",
      generate: "Generate code",
      generating: "Generating...",
      heading: "Invitation codes",
      hideUsers: "Hide users",
      hideUsersFor: "Hide users for invitation code {code}",
      invitationOnlyDescription: "Local development and tests default this off unless enabled here.",
      loading: "Loading admin",
      maxRedemptions: "Uses",
      navCodes: "Invitation codes",
      noExpiry: "No expiry",
      note: "Note",
      noteFor: "Note for {code}",
      off: "Off",
      on: "On",
      requireInvitation: "Require invitation code",
      saveNote: "Save note",
      saveNoteFor: "Save note for {code}",
      settings: "Settings",
      showUsers: "Show users",
      showUsersFor: "Show users for invitation code {code}",
      source: "Source: {source}",
      statusActive: "Active",
      statusDisabled: "Disabled",
      statusExhausted: "Exhausted",
      statusExpired: "Expired",
      statusUsed: "Used",
      subtitle: "Manage registration eligibility redemption codes.",
      unknownUser: "Unknown user",
      unused: "Unused",
      used: "{count}/{max} used",
      validDays: "Valid days"
    }
  },
  "zh-CN": {
    common: {
      account: "账户",
      active: "可用",
      backToCanvas: "回到画布",
      brand: "Inquara",
      cancel: "取消",
      copied: "已复制",
      delete: "删除",
      deleting: "删除中",
      edit: "编辑",
      loading: "加载中",
      more: "更多",
      optional: "可选",
      save: "保存",
      unknown: "未知"
    },
    language: {
      ariaLabel: "语言",
      menuLabel: "语言菜单"
    },
    auth: {
      authMode: "认证模式",
      createAccount: "创建账户",
      email: "邮箱",
      invitationCode: "邀请码",
      invitationMore: "更多",
      loginAction: "登录",
      loginFailed: "登录失败。",
      loginPanel: "登录",
      password: "密码",
      registerAction: "注册",
      rememberDevice: "记住此设备",
      submitWorking: "处理中...",
      subtitle: "登录后打开你的个人画布，并从任意回答继续延展分支。",
      title: "从一个问题开始。"
    },
    appTopBar: {
      accountAria: "账户：{user}",
      accountMenu: "账户菜单",
      admin: "管理后台",
      alpha: "Alpha",
      backToCanvas: "回到画布",
      logOut: "退出登录",
      logOutConfirm: "退出登录？",
      logOutDescription: "你需要在此设备上重新登录。",
      loggingOut: "正在退出...",
      openingCanvas: "正在打开画布...",
      resetCanvasView: "重置画布视图",
      resetView: "重置视图"
    },
    workspaceList: {
      openingCanvas: "正在打开画布",
      researchCanvas: "研究画布"
    },
    workspaceSidebar: {
      canvasActions: "{title} 的画布操作",
      canvasList: "画布列表",
      canvases: "画布",
      collapseSidebar: "收起侧边栏",
      couldNotCreate: "无法创建画布。",
      couldNotDelete: "无法删除画布。",
      couldNotLoad: "无法加载工作区。",
      couldNotRename: "无法重命名画布。",
      deleteCanvas: "删除画布？",
      deleteDescription: "{title} 将从画布列表中移除。此操作使用软删除。",
      loadingCanvases: "正在加载画布",
      newCanvas: "新建画布",
      noCanvases: "还没有画布。",
      openSidebar: "打开侧边栏",
      rename: "重命名",
      save: "保存",
      untitledCanvas: "未命名画布",
      workspaceNavigation: "工作区导航"
    },
    canvas: {
      actions: "画布操作",
      currentZoom: "当前缩放 {percent}%",
      loadingCanvas: "正在加载画布",
      newChat: "新建聊天",
      organize: "整理",
      organizeAria: "将聊天整理成紧凑层级",
      preparingCanvas: "正在准备画布视图",
      resetView: "重置视图",
      resetViewAria: "重置到根聊天视图",
      stage: "画布",
      workspace: "画布工作区",
      zoomControls: "画布缩放控件"
    },
    node: {
      actions: "节点操作",
      delete: "删除",
      hideBranch: "隐藏分支",
      moreActions: "更多节点操作",
      moveToTrash: "将聊天移到回收站？",
      moveToTrashConfirm: "移到回收站",
      moveToTrashDescription: "这会隐藏此聊天及其分支，直到你从回收站恢复它们。",
      rename: "重命名",
      resize: "调整大小",
      resizeChat: "调整聊天大小"
    },
    chat: {
      askPlaceholder: "在此节点提问",
      send: "发送"
    },
    lease: {
      blockedEyebrow: "工作区已阻止",
      blockedTitle: "此工作区正在另一个客户端中使用",
      defaultMessage: "这里显示的内容可能已过期。在此客户端重新连接并重新变为活动状态前，编辑会保持禁用。",
      recoveringEyebrow: "正在恢复工作区",
      recoveringTitle: "等待恢复编辑",
      takeOver: "在此接管"
    },
    error: {
      backToCanvas: "回到画布",
      defaultHeading: "此视图暂时中断。",
      defaultMessage: "页面加载时被中断。请重试，或返回画布。",
      globalHeading: "工作区遇到问题。",
      globalMessage: "页面未能完成加载。请重试，或从新标签页返回画布。",
      holdOn: "请稍候",
      tryAgain: "重试"
    },
    notFound: {
      action: "回到画布",
      message: "此页面不可用，或你没有访问权限。",
      title: "页面未找到"
    },
    adminCodes: {
      active: "可用",
      admin: "管理",
      by: "创建者：{email}",
      copyCode: "复制邀请码",
      copyInvitationCode: "复制邀请码 {code}",
      deleteCode: "删除邀请码",
      deleteCodeAria: "删除邀请码 {code}",
      deleteConfirm: "删除邀请码？",
      deleteDescription: "{code} 将被永久删除。只有未使用的邀请码可以删除。",
      disable: "停用",
      enable: "启用",
      exactExpiry: "或指定过期时间",
      editNoteFor: "编辑 {code} 的备注",
      expires: "过期时间 {date}",
      failedCopy: "复制邀请码失败。",
      failedCreate: "创建邀请码失败。",
      failedDelete: "删除邀请码失败。",
      failedDisable: "停用邀请码失败。",
      failedEnable: "启用邀请码失败。",
      failedLoad: "加载管理邀请码失败。",
      failedNote: "更新备注失败。",
      failedSetting: "更新注册设置失败。",
      generate: "生成邀请码",
      generating: "生成中...",
      heading: "邀请码",
      hideUsers: "隐藏用户",
      hideUsersFor: "隐藏邀请码 {code} 的用户",
      invitationOnlyDescription: "本地开发和测试默认关闭；可在这里启用。",
      loading: "正在加载管理后台",
      maxRedemptions: "使用次数",
      navCodes: "邀请码",
      noExpiry: "不过期",
      note: "备注",
      noteFor: "{code} 的备注",
      off: "关",
      on: "开",
      requireInvitation: "需要邀请码",
      saveNote: "保存备注",
      saveNoteFor: "保存 {code} 的备注",
      settings: "设置",
      showUsers: "显示用户",
      showUsersFor: "显示邀请码 {code} 的用户",
      source: "来源：{source}",
      statusActive: "可用",
      statusDisabled: "已停用",
      statusExhausted: "已用尽",
      statusExpired: "已过期",
      statusUsed: "已使用",
      subtitle: "管理注册资格邀请码。",
      unknownUser: "未知用户",
      unused: "未使用",
      used: "已用 {count}/{max}",
      validDays: "有效天数"
    }
  }
} as const;

type WidenStrings<T> = T extends string
  ? string
  : T extends ReadonlyArray<infer Item>
    ? ReadonlyArray<WidenStrings<Item>>
    : T extends object
      ? { readonly [Key in keyof T]: WidenStrings<T[Key]> }
      : T;

export type AppMessages = WidenStrings<(typeof messages)["en"]>;

export function getMessages(locale: AppLocale): AppMessages {
  return messages[locale];
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}
