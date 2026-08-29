import {
  type buildTanaIndex,
  normalizeFieldValue,
  nodeText,
  resolveSupertagDefinition,
  type FieldDefinition,
  type FieldValue,
  type NodeId,
} from '@platejs/tana';

import { useWorkspace } from '../workspace/WorkspaceShell';

const definitionsForNode = (
  index: ReturnType<typeof buildTanaIndex>,
  nodeId: NodeId
): readonly FieldDefinition[] => {
  const node = index.nodes.get(nodeId);
  const definitions = new Map(
    [...index.nodes.values()].flatMap((candidate) =>
      candidate.metadata.supertagDefinition
        ? [[candidate.nodeId, candidate.metadata.supertagDefinition] as const]
        : []
    )
  );
  const fields = new Map<string, FieldDefinition>();
  for (const tagId of node?.metadata.supertags ?? []) {
    for (const field of resolveSupertagDefinition(tagId, definitions)?.fields ??
      []) {
      fields.set(field.id, field);
    }
  }
  for (const field of node?.metadata.fieldDefinitions ?? []) {
    fields.set(field.id, field);
  }
  return [...fields.values()];
};

export const Inspector = () => {
  const { editor, index, openNode, setWorkspace, workspace } = useWorkspace();
  if (!workspace.inspectorOpen) return null;
  const node =
    workspace.activeNodeId && index.nodes.get(workspace.activeNodeId);
  const fields = node ? definitionsForNode(index, node.nodeId) : [];
  return (
    <aside className="inspector">
      <div className="inspector-head">
        <span>NODE DETAILS</span>
        <button
          type="button"
          onClick={() =>
            setWorkspace((state) => ({ ...state, inspectorOpen: false }))
          }
        >
          x
        </button>
      </div>
      {node ? (
        <>
          <h2>{nodeText(node, index.nodes) || 'Untitled'}</h2>
          <div className="id-label">{node.nodeId}</div>
          <section>
            <h3 className="section-label">SUPERTAGS</h3>
            <div className="tag-row">
              {(node.metadata.supertags ?? []).map((tag) => (
                <button
                  type="button"
                  className="applied-tag"
                  key={tag}
                  onClick={() =>
                    editor.update((tx) =>
                      tx.tana.removeSupertag({
                        nodeId: node.nodeId,
                        tagId: tag,
                      })
                    )
                  }
                >
                  #
                  {index.nodes.get(tag)?.metadata.supertagDefinition?.name ??
                    tag.split(':').at(-1)}{' '}
                  x
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="section-label">FIELDS</h3>
            {fields.map((definition) => (
              <FieldEditor
                definition={definition}
                index={index}
                key={definition.id}
                value={node.metadata.fields?.[definition.id] ?? null}
                onChange={(value) =>
                  editor.update((tx) =>
                    tx.tana.setField({
                      fieldId: definition.id,
                      nodeId: node.nodeId,
                      value,
                    })
                  )
                }
              />
            ))}
          </section>
          <section>
            <h3 className="section-label">BACKLINKS</h3>
            {(index.backlinks.get(node.nodeId) ?? []).map((id) => {
              const backlink = index.nodes.get(id);
              return backlink ? (
                <button
                  type="button"
                  className="backlink"
                  key={id}
                  onClick={() => openNode(id)}
                >
                  {nodeText(backlink, index.nodes)}
                </button>
              ) : null;
            })}
          </section>
          <section>
            <h3 className="section-label">PLACEMENTS</h3>
            <p>
              {index.placementsByNode.get(node.nodeId)?.length ?? 0} location(s)
              in this vault
            </p>
          </section>
        </>
      ) : (
        <div className="empty-inspector">
          <p>Select a bullet to inspect its canonical node.</p>
        </div>
      )}
    </aside>
  );
};

const FieldEditor = ({
  definition,
  index,
  onChange,
  value,
}: {
  definition: FieldDefinition;
  index: ReturnType<typeof buildTanaIndex>;
  onChange: (value: FieldValue) => void;
  value: FieldValue;
}) => {
  if (definition.type === 'boolean') {
    return (
      <label className="field-input">
        <span>{definition.label}</span>
        <input
          checked={Boolean(value)}
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }
  if (definition.type === 'select') {
    return (
      <label className="field-input">
        <span>{definition.label}</span>
        <select
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">-</option>
          {definition.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }
  if (definition.type === 'node-reference') {
    return (
      <label className="field-input">
        <span>{definition.label}</span>
        <select
          value={Array.isArray(value) ? String(value[0] ?? '') : ''}
          onChange={(event) =>
            onChange(event.target.value ? [event.target.value] : [])
          }
        >
          <option value="">-</option>
          {[...index.nodes.values()].map((node) => (
            <option key={node.nodeId} value={node.nodeId}>
              {nodeText(node, index.nodes) || 'Untitled'}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const inputType =
    definition.type === 'date'
      ? 'date'
      : definition.type === 'number'
        ? 'number'
        : 'text';
  return (
    <label className="field-input">
      <span>{definition.label}</span>
      <input
        type={inputType}
        value={String(value ?? '')}
        onChange={(event) =>
          onChange(normalizeFieldValue(definition, event.target.value))
        }
      />
    </label>
  );
};
