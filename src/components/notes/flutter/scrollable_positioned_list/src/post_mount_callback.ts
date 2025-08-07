import { StatelessWidget, Widget, BuildContext, Key, StatelessElement, Element } from '../../../../flutter/widgets';

/**
 * Widget whose Element calls a callback when the element is mounted.
 */
export class PostMountCallback extends StatelessWidget {
  /// The widget below this widget in the tree.
  readonly child: Widget;

  /// Callback to call when the element for this widget is mounted.
  readonly callback?: () => void;

  /// Creates a PostMountCallback widget.
  constructor(options: {
    child: Widget;
    callback?: () => void;
    key?: Key;
  }) {
    super(options.key);
    this.child = options.child;
    this.callback = options.callback;
  }

  createElement(): StatelessElement {
    return new PostMountCallbackElement(this);
  }

  build(context: BuildContext): Widget {
    return this.child;
  }
}

class PostMountCallbackElement extends StatelessElement {
  constructor(widget: PostMountCallback) {
    super(widget);
  }

  mount(parent?: Element, newSlot?: any): void {
    super.mount(parent, newSlot);
    const postMountCallback = this.widget as PostMountCallback;
    postMountCallback.callback?.();
  }
}