import { BlockComponentConfiguration, BlockComponentBuilder } from './base_component/block_component_configuration';

export const standardBlockComponentConfiguration = new BlockComponentConfiguration();

// Block component keys
export class PageBlockKeys {
  static readonly type = 'page';
}

export class ParagraphBlockKeys {
  static readonly type = 'paragraph';
}

export class TodoListBlockKeys {
  static readonly type = 'todo_list';
}

export class BulletedListBlockKeys {
  static readonly type = 'bulleted_list';
}

export class NumberedListBlockKeys {
  static readonly type = 'numbered_list';
}

export class QuoteBlockKeys {
  static readonly type = 'quote';
}

export class HeadingBlockKeys {
  static readonly type = 'heading';
  static readonly level = 'level';
}

export class ImageBlockKeys {
  static readonly type = 'image';
}

export class DividerBlockKeys {
  static readonly type = 'divider';
}

export class TableBlockKeys {
  static readonly type = 'table';
}

export class TableCellBlockKeys {
  static readonly type = 'table_cell';
}

// Placeholder for block component builders - these would need full implementations
export const standardBlockComponentBuilderMap: Record<string, BlockComponentBuilder> = {
  [PageBlockKeys.type]: new PageBlockComponentBuilder(),
  [ParagraphBlockKeys.type]: new ParagraphBlockComponentBuilder({
    configuration: standardBlockComponentConfiguration.copyWith({
      placeholderText: (_) => 'Type \'/\' for commands',
    }),
  }),
  [TodoListBlockKeys.type]: new TodoListBlockComponentBuilder({
    configuration: standardBlockComponentConfiguration.copyWith({
      placeholderText: (_) => 'To-do',
    }),
  }),
  [BulletedListBlockKeys.type]: new BulletedListBlockComponentBuilder({
    configuration: standardBlockComponentConfiguration.copyWith({
      placeholderText: (_) => 'List',
    }),
  }),
  [NumberedListBlockKeys.type]: new NumberedListBlockComponentBuilder({
    configuration: standardBlockComponentConfiguration.copyWith({
      placeholderText: (_) => 'List',
    }),
  }),
  [QuoteBlockKeys.type]: new QuoteBlockComponentBuilder({
    configuration: standardBlockComponentConfiguration.copyWith({
      placeholderText: (_) => 'Quote',
    }),
  }),
  [HeadingBlockKeys.type]: new HeadingBlockComponentBuilder({
    configuration: standardBlockComponentConfiguration.copyWith({
      placeholderText: (node) => `Heading ${node.attributes[HeadingBlockKeys.level]}`,
    }),
  }),
  [ImageBlockKeys.type]: new ImageBlockComponentBuilder(),
  [DividerBlockKeys.type]: new DividerBlockComponentBuilder({
    configuration: standardBlockComponentConfiguration.copyWith({
      padding: (_) => ({ vertical: 8.0 }),
    }),
  }),
  [TableBlockKeys.type]: new TableBlockComponentBuilder(),
  [TableCellBlockKeys.type]: new TableCellBlockComponentBuilder(),
};

// Placeholder classes - these would need full implementations
class PageBlockComponentBuilder extends BlockComponentBuilder {}
class ParagraphBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration: BlockComponentConfiguration }) {
    super(options.configuration);
  }
}
class TodoListBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration: BlockComponentConfiguration }) {
    super(options.configuration);
  }
}
class BulletedListBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration: BlockComponentConfiguration }) {
    super(options.configuration);
  }
}
class NumberedListBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration: BlockComponentConfiguration }) {
    super(options.configuration);
  }
}
class QuoteBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration: BlockComponentConfiguration }) {
    super(options.configuration);
  }
}
class HeadingBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration: BlockComponentConfiguration }) {
    super(options.configuration);
  }
}
class ImageBlockComponentBuilder extends BlockComponentBuilder {}
class DividerBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration: BlockComponentConfiguration }) {
    super(options.configuration);
  }
}
class TableBlockComponentBuilder extends BlockComponentBuilder {}
class TableCellBlockComponentBuilder extends BlockComponentBuilder {}

// Shortcut events - these would need full implementations
export const standardCharacterShortcutEvents: any[] = [
  // Placeholder for character shortcut events
];

export const standardCommandShortcutEvents: any[] = [
  // Placeholder for command shortcut events
];